import { z } from "zod";
import type { ContactType } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Ajustes manuais de interações por franqueado.
 *
 * O total de interações de um franqueado é SEMPRE derivado:
 *   totalInteractions = registeredInteractions + manualAdjustments
 *
 * - registeredInteractions: contagem de Contact (registros reais do sistema,
 *   incluindo Lives com presença, que geram Contact do tipo LIVE). Regras de
 *   contato qualificado, WhatsApp, Live, último contato e URGENTE/EM DIA
 *   permanecem intactas e NUNCA consideram ajustes manuais.
 * - manualAdjustments: SUM(InteractionAdjustment.amount) via aggregate
 *   (inclui ajustes legados sem canal).
 * - Por canal: Contacts do ContactType + SUM(ajustes do mesmo ContactType).
 *   Ajustes legados (type NULL) entram SOMENTE no total geral.
 *
 * Nenhum total é armazenado de forma mutável: duas inclusões simultâneas
 * apenas inserem linhas independentes, sem sobrescrita (concorrência segura).
 */

export const MAX_ADJUSTMENT_AMOUNT = 1000;

export const ADJUSTMENT_TYPES = [
  "WHATSAPP",
  "TELEFONE",
  "VIDEO_CHAMADA",
  "PRESENCIAL",
  "LIVE",
] as const satisfies readonly ContactType[];

export const adjustmentInputSchema = z.object({
  amount: z
    .number({
      error: "Informe uma quantidade válida.",
    })
    .int("A quantidade precisa ser um número inteiro.")
    .min(1, "A quantidade precisa ser maior que zero.")
    .max(
      MAX_ADJUSTMENT_AMOUNT,
      `A quantidade não pode ser maior que ${MAX_ADJUSTMENT_AMOUNT}.`,
    ),
  type: z.enum(ADJUSTMENT_TYPES, {
    error: "Selecione um canal válido.",
  }),
  notes: z
    .string()
    .trim()
    .max(500, "A observação pode ter no máximo 500 caracteres.")
    .optional()
    .or(z.literal("")),
});

export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>;

export type ChannelBreakdown = {
  registered: number;
  manual: number;
  total: number;
};

export type InteractionTotals = {
  registeredInteractions: number;
  manualAdjustments: number;
  totalInteractions: number;
};

export type InteractionBreakdown = InteractionTotals & {
  byType: Record<ContactType, ChannelBreakdown>;
};

export function emptyBreakdown(): InteractionBreakdown {
  const byType = {} as Record<ContactType, ChannelBreakdown>;
  for (const type of ADJUSTMENT_TYPES) {
    byType[type] = { registered: 0, manual: 0, total: 0 };
  }
  return { registeredInteractions: 0, manualAdjustments: 0, totalInteractions: 0, byType };
}

export async function getManualAdjustmentsTotal(
  franchiseeId: string,
): Promise<number> {
  const result = await prisma.interactionAdjustment.aggregate({
    where: { franchiseeId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/**
 * Totais de ajustes manuais para vários franqueados em UMA query
 * (groupBy + _sum). Usado pela TV/listas para não carregar históricos.
 */
export async function getManualAdjustmentsTotals(
  franchiseeIds: string[],
): Promise<Map<string, number>> {
  if (!franchiseeIds.length) return new Map();
  const groups = await prisma.interactionAdjustment.groupBy({
    by: ["franchiseeId"],
    where: { franchiseeId: { in: franchiseeIds } },
    _sum: { amount: true },
  });
  return new Map(
    groups.map((group) => [group.franchiseeId, group._sum.amount ?? 0]),
  );
}

export async function getInteractionTotals(
  franchiseeId: string,
): Promise<InteractionTotals> {
  const [registeredInteractions, manualAdjustments] = await Promise.all([
    prisma.contact.count({ where: { franchiseeId } }),
    getManualAdjustmentsTotal(franchiseeId),
  ]);
  return {
    registeredInteractions,
    manualAdjustments,
    totalInteractions: registeredInteractions + manualAdjustments,
  };
}

/**
 * Breakdown completo por canal para UMA unidade:
 * Contacts do tipo + SUM(ajustes do mesmo tipo).
 * Ajustes legados (type NULL) contam no manual/total geral, sem canal.
 */
export async function getInteractionBreakdown(
  franchiseeId: string,
): Promise<InteractionBreakdown> {
  const [contactGroups, adjustmentGroups, manualAdjustments] =
    await Promise.all([
      prisma.contact.groupBy({
        by: ["type"],
        where: { franchiseeId },
        _count: { _all: true },
      }),
      prisma.interactionAdjustment.groupBy({
        by: ["type"],
        where: { franchiseeId },
        _sum: { amount: true },
      }),
      getManualAdjustmentsTotal(franchiseeId),
    ]);

  const breakdown = emptyBreakdown();
  for (const group of contactGroups) {
    breakdown.byType[group.type].registered = group._count._all;
  }
  for (const group of adjustmentGroups) {
    // type NULL = ajuste legado: só total geral, nunca um canal.
    if (group.type) {
      breakdown.byType[group.type].manual = group._sum.amount ?? 0;
    }
  }
  let registeredInteractions = 0;
  for (const type of ADJUSTMENT_TYPES) {
    const channel = breakdown.byType[type];
    channel.total = channel.registered + channel.manual;
    registeredInteractions += channel.registered;
  }
  return {
    registeredInteractions,
    manualAdjustments,
    totalInteractions: registeredInteractions + manualAdjustments,
    byType: breakdown.byType,
  };
}

/**
 * Manuais por canal para VÁRIAS unidades em UMA query
 * (groupBy franchiseeId+type + _sum). Legados (NULL) são ignorados aqui
 * porque não pertencem a canal algum (seguem no total via aggregate).
 * Usado por TV/dashboard sem N+1 e sem carregar históricos.
 */
export async function getManualAdjustmentsByType(
  franchiseeIds: string[],
): Promise<Map<string, Map<ContactType, number>>> {
  if (!franchiseeIds.length) return new Map();
  return (await getManualAdjustmentsSummary(franchiseeIds)).byUnit;
}

/**
 * Resumo global dos manuais tipados em UMA query: por unidade e por tipo.
 * Sem filtro de unidade quando ids omitido (dashboard/rede toda).
 */
export async function getManualAdjustmentsSummary(franchiseeIds?: string[]): Promise<{
  byUnit: Map<string, Map<ContactType, number>>;
  byType: Map<ContactType, number>;
}> {
  const byUnit = new Map<string, Map<ContactType, number>>();
  const byType = new Map<ContactType, number>();
  const groups = await prisma.interactionAdjustment.groupBy({
    by: ["franchiseeId", "type"],
    ...(franchiseeIds ? { where: { franchiseeId: { in: franchiseeIds } } } : {}),
    _sum: { amount: true },
  });
  for (const group of groups) {
    // type NULL = ajuste legado: só total geral, nunca um canal.
    if (!group.type) continue;
    const value = group._sum.amount ?? 0;
    const perUnit = byUnit.get(group.franchiseeId) ?? new Map<ContactType, number>();
    perUnit.set(group.type, (perUnit.get(group.type) ?? 0) + value);
    byUnit.set(group.franchiseeId, perUnit);
    byType.set(group.type, (byType.get(group.type) ?? 0) + value);
  }
  return { byUnit, byType };
}
