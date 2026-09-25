import { z } from "zod";
import { prisma } from "@/lib/db";

export const MONTHLY_COUNT_MAX = 1000000;
export const MONTHLY_YEAR_MIN = 2000;
export const MONTHLY_YEAR_MAX = 2100;

// Inteiro estrito a partir de número (JSON) ou string (<input type="number">).
// Rejeita decimais, negativos e lixo como "12abc" (sem parse permissivo).
function toStrictInt(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return Number(trimmed);
  }
  return null;
}

function strictInt(min: number, max: number, message: string) {
  return z.union([z.number(), z.string()]).transform((value, ctx) => {
    const parsed = toStrictInt(value);
    if (parsed === null || parsed < min || parsed > max) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return parsed;
  });
}

// Competência + quantidade de um mês (criação). count 0 é válido.
export const monthlyServiceCountInputSchema = z.object({
  year: strictInt(
    MONTHLY_YEAR_MIN,
    MONTHLY_YEAR_MAX,
    `Ano inválido. Use um ano entre ${MONTHLY_YEAR_MIN} e ${MONTHLY_YEAR_MAX}.`,
  ),
  month: strictInt(1, 12, "Mês inválido. Use um mês entre 1 e 12."),
  count: strictInt(
    0,
    MONTHLY_COUNT_MAX,
    `Quantidade deve ser um número inteiro entre 0 e ${MONTHLY_COUNT_MAX}.`,
  ),
});

// Edição: só a quantidade muda; competência (year/month) é imutável.
export const monthlyServiceCountUpdateSchema = z.object({
  count: strictInt(
    0,
    MONTHLY_COUNT_MAX,
    `Quantidade deve ser um número inteiro entre 0 e ${MONTHLY_COUNT_MAX}.`,
  ),
});

export const monthlyServiceCountSelect = {
  id: true,
  year: true,
  month: true,
  count: true,
  updatedAt: true,
} as const;

export async function getMonthlyServiceCounts(franchiseeId: string) {
  return prisma.franchiseeMonthlyServiceCount.findMany({
    where: { franchiseeId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: monthlyServiceCountSelect,
  });
}
