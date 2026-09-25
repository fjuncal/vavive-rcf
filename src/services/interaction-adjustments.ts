import { z } from "zod";
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
 * - manualAdjustments: SUM(InteractionAdjustment.amount) via aggregate.
 *
 * Nenhum total é armazenado de forma mutável: duas inclusões simultâneas
 * apenas inserem linhas independentes, sem sobrescrita (concorrência segura).
 */

export const MAX_ADJUSTMENT_AMOUNT = 1000;

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
  notes: z
    .string()
    .trim()
    .max(500, "A observação pode ter no máximo 500 caracteres.")
    .optional()
    .or(z.literal("")),
});

export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>;

export type InteractionTotals = {
  registeredInteractions: number;
  manualAdjustments: number;
  totalInteractions: number;
};

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
