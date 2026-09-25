import { NextResponse } from "next/server";
import { z } from "zod";
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

const memberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da pessoa."),
  photoUrl: z.string().url("URL da foto inválida").optional().or(z.literal("")),
  active: z.boolean().default(true),
});

async function getUnit(id: string) {
  return prisma.franchisee.findUnique({
    where: { id },
    select: { id: true },
  });
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;
  if (!(await getUnit(id))) {
    return NextResponse.json(
      { message: "Franqueado não encontrado." },
      { status: 404 },
    );
  }

  // Pessoa principal (backfill) primeiro: ordem de criação.
  const members = await prisma.franchiseeMember.findMany({
    where: { franchiseeId: id },
    orderBy: { createdAt: "asc" },
    select: memberSelect,
  });
  return NextResponse.json(members);
}

export async function POST(
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
  if (!hasAnyRole(user, OPERATIONS_ROLES)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await params;
  if (!(await getUnit(id))) {
    return NextResponse.json(
      { message: "Franqueado não encontrado." },
      { status: 404 },
    );
  }

  let payload: z.infer<typeof memberSchema>;
  try {
    payload = memberSchema.parse(await request.json());
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

  const member = await prisma.franchiseeMember.create({
    data: {
      franchiseeId: id,
      name: payload.name,
      photoUrl: payload.photoUrl || null,
      active: payload.active,
    },
    select: memberSelect,
  });
  return NextResponse.json(member, { status: 201 });
}
