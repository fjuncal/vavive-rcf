import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/services/auth";
import { monthlyServiceCountUpdateSchema } from "@/services/monthly-service-counts";

// Edição de lançamento mensal por SUPERADMIN: só a quantidade muda.
// Competência (year/month) é imutável; `data` explícito, sem spread.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> },
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
      { message: "Somente SUPERADMIN pode editar atendimentos mensais." },
      { status: 403 },
    );
  }

  const { id, recordId } = await params;
  const existing =
    await prisma.franchiseeMonthlyServiceCount.findUnique({
      where: { id: recordId },
      select: { id: true, franchiseeId: true },
    });
  if (!existing || existing.franchiseeId !== id) {
    return NextResponse.json(
      { message: "Registro não encontrado nesta unidade." },
      { status: 404 },
    );
  }

  let payload: z.infer<typeof monthlyServiceCountUpdateSchema>;
  try {
    payload = monthlyServiceCountUpdateSchema.parse(await request.json());
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

  const updated = await prisma.franchiseeMonthlyServiceCount.update({
    where: { id: recordId },
    data: { count: payload.count },
  });
  return NextResponse.json(updated);
}
