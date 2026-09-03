import { NextResponse } from "next/server";
import { getSessionUser, hasAnyRole, TV_ACCESS_ROLES } from "@/services/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Sessão inválida ou expirada." }, { status: 401 });
  if (!hasAnyRole(user, TV_ACCESS_ROLES)) return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  const { id } = await params;
  const contacts = await prisma.contact.findMany({ where: { franchiseeId: id }, orderBy: [{ contactedAt: "desc" }, { createdAt: "desc" }], take: 5, select: { id: true, type: true, contactedAt: true, user: { select: { name: true } } } });
  return NextResponse.json(contacts);
}
