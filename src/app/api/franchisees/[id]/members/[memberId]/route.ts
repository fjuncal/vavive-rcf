import { NextResponse } from "next/server";
import { z } from "zod";
import { photoUrlSchema } from "@/domain/franchisee";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  hasAnyRole,
  OPERATIONS_ROLES,
} from "@/services/auth";

const memberSelect = {
  id: true,
  name: true,
  photoUrl: true,
  active: true,
  createdAt: true,
} as const;

const memberUpdateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da pessoa."),
  photoUrl: photoUrlSchema,
});

function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Dados inválidos.";
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }
  if (!hasAnyRole(user, OPERATIONS_ROLES)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id: franchiseeId, memberId } = await params;
  const franchisee = await prisma.franchisee.findUnique({
    where: { id: franchiseeId },
    select: { id: true },
  });
  if (!franchisee) {
    return NextResponse.json(
      { message: "Franqueado não encontrado." },
      { status: 404 },
    );
  }

  const member = await prisma.franchiseeMember.findFirst({
    where: { id: memberId, franchiseeId },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json(
      { message: "Pessoa não encontrada nesta unidade." },
      { status: 404 },
    );
  }

  let payload: z.infer<typeof memberUpdateSchema>;
  try {
    payload = memberUpdateSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? validationMessage(error)
            : "Dados inválidos.",
      },
      { status: 400 },
    );
  }

  const primary = await prisma.franchiseeMember.findFirst({
    where: { franchiseeId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const photoUrl = payload.photoUrl || null;

  const updatedMember = await prisma.$transaction(async (tx) => {
    // Legacy mirror applies only to oldest member, representing original
    // Franchisee.name/photoUrl fields.
    if (primary?.id === member.id) {
      await tx.franchisee.update({
        where: { id: franchiseeId },
        data: { name: payload.name, photoUrl },
      });
    }

    return tx.franchiseeMember.update({
      where: { id: member.id },
      data: { name: payload.name, photoUrl },
      select: memberSelect,
    });
  });

  return NextResponse.json(updatedMember);
}
