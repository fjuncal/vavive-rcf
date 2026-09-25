import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/services/auth";

// Edição de Contact REAL por SUPERADMIN (correção de registro).
// Campos editáveis: type, contactedAt, memberId, notes.
// Bloqueados: id, franchiseeId, userId, createdAt e auditoria estrutural
// (nunca aceitos do payload; update com `data` explícito).
// Editável via PUT: type, contactedAt, memberId, notes.
export const contactEditSchema = z.object({
  type: z.enum(["WHATSAPP", "TELEFONE", "VIDEO_CHAMADA", "PRESENCIAL", "LIVE"]),
  contactedAt: z.string().datetime({ message: "Data e hora inválidas." }),
  memberId: z.string().min(1).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }
  if (user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { message: "Somente SUPERADMIN pode editar registros de contato." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const existing = await prisma.contact.findUnique({
    where: { id },
    select: {
      id: true,
      franchiseeId: true,
      userId: true,
      type: true,
      contactedAt: true,
      memberId: true,
      liveParticipant: { select: { id: true } },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { message: "Registro não encontrado." },
      { status: 404 },
    );
  }
  let payload: z.infer<typeof contactEditSchema>;

  try {
    payload = contactEditSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? error.issues[0]?.message || "Dados inválidos."
            : "Dados inválidos.",
      },
      { status: 400 },
    );
  }

  // memberId ausente = mantém; "" = remove pessoa; id = valida mesma unidade.
  const memberId =
    payload.memberId === undefined ? existing.memberId : payload.memberId || null;
  if (memberId) {
    const member = await prisma.franchiseeMember.findUnique({
      where: { id: memberId },
      select: { franchiseeId: true },
    });
    if (!member || member.franchiseeId !== existing.franchiseeId) {
      return NextResponse.json(
        { message: "A pessoa informada não pertence a esta unidade." },
        { status: 400 },
      );
    }
  }

  // Integridade LiveParticipant ↔ Contact: contato gerado por Live mantém
  // canal e data (vínculo com a Live); corrigir pela edição da Live.
  if (existing.liveParticipant) {
    if (payload.type !== existing.type) {
      return NextResponse.json(
        {
          message:
            "Este contato foi gerado por uma Live e o canal não pode ser alterado. Edite a Live para corrigir a participação.",
        },
        { status: 400 },
      );
    }
    if (
      new Date(payload.contactedAt).getTime() !== existing.contactedAt.getTime()
    ) {
      return NextResponse.json(
        {
          message:
            "Este contato foi gerado por uma Live e a data não pode ser alterada. Edite a Live para corrigir.",
        },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      type: payload.type,
      contactedAt: new Date(payload.contactedAt),
      memberId,
      notes: payload.notes || null,
    },
    select: {
      id: true,
      franchiseeId: true,
      type: true,
      contactedAt: true,
      notes: true,
      updatedAt: true,
      user: { select: { name: true } },
      member: { select: { id: true, name: true } },
    },
  });

  // Métricas (canais, qualificados, lastContact, attention) são recalculadas
  // a partir dos dados reais via router.refresh() no cliente e refetch na TV.
  return NextResponse.json(updated);
}
