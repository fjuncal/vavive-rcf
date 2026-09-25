import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  hasAnyRole,
  requireAnyRole,
  TV_ACCESS_ROLES,
} from "@/services/auth";
import { getContactAttention } from "@/lib/contact-attention";
const schema = z.object({
  franchiseeId: z.string().min(1),
  // Pessoa com quem ocorreu o contato (opcional): NULL = contato da unidade,
  // preservando o fluxo rápido da TV e o histórico antigo.
  memberId: z.string().min(1).optional().or(z.literal("")),
  type: z.enum(["WHATSAPP", "TELEFONE", "VIDEO_CHAMADA", "PRESENCIAL", "LIVE"]),
  contactedAt: z.string().datetime(),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  if (!hasAnyRole(user, TV_ACCESS_ROLES))
    return NextResponse.json(
      { message: "Sem permissão para registrar contatos." },
      { status: 403 },
    );
  try {
    const p = schema.parse(await request.json());
    // Se informada, a pessoa precisa pertencer à unidade do contato.
    if (p.memberId) {
      const member = await prisma.franchiseeMember.findUnique({
        where: { id: p.memberId },
        select: { franchiseeId: true },
      });
      if (!member || member.franchiseeId !== p.franchiseeId) {
        return NextResponse.json(
          { message: "A pessoa informada não pertence a esta unidade." },
          { status: 400 },
        );
      }
    }
    const contact = await prisma.contact.create({
      data: {
        franchiseeId: p.franchiseeId,
        ...(p.memberId ? { memberId: p.memberId } : {}),
        userId: user.id,
        type: p.type,
        contactedAt: new Date(p.contactedAt),
        notes: p.notes || null,
      },
      include: {
        user: { select: { name: true, role: true } },
        franchisee: { select: { name: true, unitName: true, moment: true } },
        member: { select: { name: true } },
      },
    });
    return NextResponse.json(
      {
        ...contact,
        // Contato recém-registrado = 0 dias sem contato; atenção recalculada
        // com a regra da unidade (MUITA ATENÇÃO desaparece de imediato).
        attentionStatus: getContactAttention(0, contact.franchisee.moment),
        daysWithoutContact: 0,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? error.issues[0]?.message || "Dados inválidos."
            : "Erro ao registrar contato.",
      },
      { status: 400 },
    );
  }
}
export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  const id = String((await request.json().catch(() => ({}))).id || "");
  const contact =
    id &&
    (await prisma.contact.findUnique({
      where: { id },
      select: { userId: true, createdAt: true },
    }));
  if (!contact)
    return NextResponse.json(
      { message: "Registro não encontrado." },
      { status: 404 },
    );
  const canUndo =
    contact.userId === user.id &&
    Date.now() - contact.createdAt.getTime() <= 15_000;
  if (!hasAnyRole(user, ["SUPERADMIN"]) && !canUndo)
    return NextResponse.json(
      { message: "O período para desfazer expirou." },
      { status: 403 },
    );
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
export async function PUT(request: Request) {
  await requireAnyRole(["SUPERADMIN"]);
  try {
    const body = await request.json();
    const p = schema.parse(body);
    return NextResponse.json(
      await prisma.contact.update({
        where: { id: String(body.id) },
        data: {
          franchiseeId: p.franchiseeId,
          type: p.type,
          contactedAt: new Date(p.contactedAt),
          notes: p.notes || null,
        },
      }),
    );
  } catch {
    return NextResponse.json(
      { message: "Não foi possível editar o registro." },
      { status: 400 },
    );
  }
}
