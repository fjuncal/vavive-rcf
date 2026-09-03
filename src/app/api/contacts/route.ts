import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/services/auth";
import { requireRole } from "@/services/auth";

const schema = z.object({
  franchiseeId: z.string().min(1),
  type: z.enum(["WHATSAPP", "TELEFONE", "VIDEO_CHAMADA", "PRESENCIAL"]),
  contactedAt: z.string().min(1),
  notes: z.string().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const tvKey = request.headers.get("x-tv-access-key");
    const isTV = Boolean(process.env.TV_ACCESS_KEY && tvKey === process.env.TV_ACCESS_KEY);
    const user = isTV ? await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } }) : await requireAuth();
    if (!user) return NextResponse.json({ message: "Nenhum usuário ativo disponível." }, { status: 401 });
    const payload = schema.parse(await request.json());

    const contact = await prisma.contact.create({
      data: {
        franchiseeId: payload.franchiseeId,
        userId: user.id,
        type: payload.type,
        contactedAt: new Date(payload.contactedAt),
        notes: payload.notes || null,
      },
      include: {
        user: { select: { name: true } },
        franchisee: true,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message || "Dados inválidos." }, { status: 400 });
    }

    return NextResponse.json({ message: "Erro ao registrar contato." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await requireRole("SUPERADMIN");
  try {
    const body = await request.json();
    const payload = schema.parse(body);
    const contact = await prisma.contact.update({ where: { id: String(body.id) }, data: { franchiseeId: payload.franchiseeId, type: payload.type, contactedAt: new Date(payload.contactedAt), notes: payload.notes || null } });
    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ message: "Não foi possível editar o registro." }, { status: 400 });
  }
}
