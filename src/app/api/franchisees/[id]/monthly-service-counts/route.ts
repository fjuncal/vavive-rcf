import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  hasAnyRole,
  OPERATIONS_ROLES,
} from "@/services/auth";
import {
  getMonthlyServiceCounts,
  monthlyServiceCountInputSchema,
} from "@/services/monthly-service-counts";

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

  return NextResponse.json(await getMonthlyServiceCounts(id));
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
  if (user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { message: "Somente SUPERADMIN pode lançar atendimentos mensais." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!(await getUnit(id))) {
    return NextResponse.json(
      { message: "Franqueado não encontrado." },
      { status: 404 },
    );
  }

  let payload: z.infer<typeof monthlyServiceCountInputSchema>;
  try {
    payload = monthlyServiceCountInputSchema.parse(await request.json());
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

  // 1 registro por franquia/mês: duplicidade vira 409 com mensagem amigável
  // (edição do mês existente via PUT, nunca upsert silencioso).
  try {
    const created = await prisma.franchiseeMonthlyServiceCount.create({
      data: {
        franchiseeId: id,
        year: payload.year,
        month: payload.month,
        count: payload.count,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          message:
            "Já existe lançamento para este mês/ano. Edite o valor existente.",
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
