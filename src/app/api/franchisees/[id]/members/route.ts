import { NextResponse } from "next/server";
import { z } from "zod";
import { photoUrlSchema } from "@/domain/franchisee";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  hasAnyRole,
  OPERATIONS_ROLES,
} from "@/services/auth";
import { birthDateSchema, birthDateToUTCDate } from "@/domain/birthdays";
import { toDateInputValue } from "@/lib/utils";

const memberSelect = {
  id: true,
  name: true,
  photoUrl: true,
  birthDate: true,
  active: true,
  createdAt: true,
} as const;

const memberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da pessoa."),
  photoUrl: photoUrlSchema,
  birthDate: birthDateSchema,
  active: z.boolean().default(true),
});

function serializeMember(member: {
  id: string;
  name: string;
  photoUrl: string | null;
  birthDate: Date | null;
  active: boolean;
  createdAt: Date;
}) {
  return { ...member, birthDate: toDateInputValue(member.birthDate) || null };
}

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
  return NextResponse.json(members.map(serializeMember));
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
      ...(payload.birthDate !== undefined
        ? { birthDate: birthDateToUTCDate(payload.birthDate) }
        : {}),
      active: payload.active,
    },
    select: memberSelect,
  });
  return NextResponse.json(serializeMember(member), { status: 201 });
}
