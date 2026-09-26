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

// Competência anterior (matemática pura em month/year, sem Date/timezone).
export function previousCompetence(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export const competenceQuerySchema = z.object({
  year: strictInt(
    MONTHLY_YEAR_MIN,
    MONTHLY_YEAR_MAX,
    `Ano inválido. Use um ano entre ${MONTHLY_YEAR_MIN} e ${MONTHLY_YEAR_MAX}.`,
  ),
  month: strictInt(1, 12, "Mês inválido. Use um mês entre 1 e 12."),
});

export type MonthlyOverviewRow = {
  id: string;
  name: string;
  unitName: string;
  memberNames: string[];
  current: { id: string; count: number } | null;
  previous: { count: number } | null;
};

// Visão consolidada: 4 queries em lote (sem N+1), merge em memória.
// Só franquias ATIVAS; count = 0 é lançamento válido (null = sem lançamento).
export async function getMonthlyOverview(year: number, month: number) {
  const previous = previousCompetence(year, month);
  const [franchisees, currentCounts, previousCounts, memberRows] =
    await Promise.all([
      prisma.franchisee.findMany({
        where: { active: true },
        orderBy: { unitName: "asc" },
        select: { id: true, name: true, unitName: true },
      }),
      prisma.franchiseeMonthlyServiceCount.findMany({
        where: { year, month },
        select: { id: true, franchiseeId: true, count: true },
      }),
      prisma.franchiseeMonthlyServiceCount.findMany({
        where: { year: previous.year, month: previous.month },
        select: { franchiseeId: true, count: true },
      }),
      prisma.franchiseeMember.findMany({
        where: { active: true },
        select: { franchiseeId: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const currentById = new Map(
    currentCounts.map((item) => [
      item.franchiseeId,
      { id: item.id, count: item.count },
    ]),
  );
  const previousById = new Map(
    previousCounts.map((item) => [item.franchiseeId, { count: item.count }]),
  );
  const membersById = new Map<string, string[]>();
  for (const member of memberRows) {
    const list = membersById.get(member.franchiseeId) ?? [];
    list.push(member.name);
    membersById.set(member.franchiseeId, list);
  }

  const rows: MonthlyOverviewRow[] = franchisees.map((franchisee) => ({
    id: franchisee.id,
    name: franchisee.name,
    unitName: franchisee.unitName,
    memberNames: membersById.get(franchisee.id) ?? [],
    current: currentById.get(franchisee.id) ?? null,
    previous: previousById.get(franchisee.id) ?? null,
  }));
  return { year, month, previousYear: previous.year, previousMonth: previous.month, rows };
}
