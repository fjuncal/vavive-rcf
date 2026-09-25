import { NextResponse } from "next/server";
import { z } from "zod";
import type { ContactType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  hasAnyRole,
  OPERATIONS_ROLES,
} from "@/services/auth";
import {
  adjustmentInputSchema,
  getInteractionTotals,
} from "@/services/interaction-adjustments";

const adjustmentSelect = {
  id: true,
  amount: true,
  type: true,
  notes: true,
  createdAt: true,
  createdByUser: { select: { name: true } },
} as const;

function toPublicAdjustment(
  item: Pick<
    {
      id: string;
      amount: number;
      type: ContactType | null;
      notes: string | null;
      createdAt: Date;
      createdByUser: { name: string };
    },
    "id" | "amount" | "type" | "notes" | "createdAt" | "createdByUser"
  >,
) {
  return {
    id: item.id,
    amount: item.amount,
    type: item.type,
    notes: item.notes,
    createdAt: item.createdAt,
    createdBy: { name: item.createdByUser.name },
  };
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
  // Histórico detalhado fica no painel administrativo.
  // A TV recebe apenas o total agregado via /api/tv.
  if (!hasAnyRole(user, OPERATIONS_ROLES)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await params;
  const franchisee = await prisma.franchisee.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!franchisee) {
    return NextResponse.json(
      { message: "Franqueado não encontrado." },
      { status: 404 },
    );
  }

  const [totals, adjustments] = await Promise.all([
    getInteractionTotals(id),
    prisma.interactionAdjustment.findMany({
      where: { franchiseeId: id },
      orderBy: { createdAt: "desc" },
      select: adjustmentSelect,
    }),
  ]);

  return NextResponse.json({
    ...totals,
    adjustments: adjustments.map(toPublicAdjustment),
  });
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
      { message: "Somente SUPERADMIN pode adicionar interações manuais." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const franchisee = await prisma.franchisee.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!franchisee) {
    return NextResponse.json(
      { message: "Franqueado não encontrado." },
      { status: 404 },
    );
  }

  let payload: z.infer<typeof adjustmentInputSchema>;
  try {
    payload = adjustmentInputSchema.parse(await request.json());
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

  // createdByUserId NUNCA vem do frontend: sempre da sessão autenticada.
  // Nenhum Contact/Live/LiveParticipant/Member é criado: 1 linha agregada.
  const created = await prisma.interactionAdjustment.create({
    data: {
      franchiseeId: id,
      amount: payload.amount,
      type: payload.type,
      notes: payload.notes || null,
      createdByUserId: user.id,
    },
    select: adjustmentSelect,
  });

  return NextResponse.json(
    {
      adjustment: toPublicAdjustment(created),
      totals: await getInteractionTotals(id),
    },
    { status: 201 },
  );
}
