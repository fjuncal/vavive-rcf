export type ContactAttention =
  | "em_dia"
  | "atencao"
  | "critico"
  | "muita_atencao"
  | "urgente";

export type AttentionMoment = "IMPLANTACAO" | "INAUGURADA";

export const CONTACT_ATTENTION_CONFIG: Record<
  ContactAttention,
  {
    label: string;
    emoji: string;
    carouselSeconds: number;
    listClass: string;
    tagClass: string;
    surfaceClass: string;
    carouselClass: string;
  }
> = {
  em_dia: {
    label: "Em dia",
    emoji: "✓",
    carouselSeconds: 12,
    listClass: "border-emerald-300 bg-emerald-50/70",
    tagClass: "bg-emerald-600 text-white shadow-lg shadow-emerald-950/20",
    surfaceClass:
      "bg-gradient-to-br from-[#003b71] via-[#07547b] to-[#0b8f45]",
    carouselClass:
      "ring-4 ring-emerald-300/80 shadow-2xl shadow-emerald-500/15",
  },
  atencao: {
    label: "Atenção",
    emoji: "⚠",
    carouselSeconds: 20,
    listClass: "border-amber-300 bg-amber-50/75",
    tagClass:
      "bg-amber-300 text-amber-950 ring-2 ring-amber-100 shadow-lg shadow-amber-950/30",
    surfaceClass:
      "bg-gradient-to-br from-[#073b5b] via-[#8a5600] to-[#c68100]",
    carouselClass: "ring-4 ring-amber-300 shadow-2xl shadow-amber-500/25",
  },
  critico: {
    label: "Atenção máxima",
    emoji: "⚠",
    carouselSeconds: 32,
    listClass: "border-red-300 bg-red-50/75",
    tagClass:
      "bg-red-600 text-white ring-2 ring-red-200 shadow-lg shadow-red-950/35",
    surfaceClass:
      "bg-gradient-to-br from-[#48152a] via-[#9f1e31] to-[#dc3f32]",
    carouselClass: "ring-4 ring-red-400 shadow-2xl shadow-red-600/35",
  },
  muita_atencao: {
    label: "Muita atenção",
    emoji: "⚠",
    carouselSeconds: 40,
    listClass: "border-orange-400 bg-orange-50/80",
    tagClass: "bg-orange-500 text-white shadow-lg shadow-orange-950/25",
    surfaceClass:
      "bg-gradient-to-br from-[#431407] via-[#c2410c] to-[#fb923c]",
    carouselClass: "ring-4 ring-orange-300 shadow-2xl shadow-orange-500/30",
  },
  urgente: {
    label: "Urgente",
    emoji: "🚨",
    carouselSeconds: 50,
    listClass: "border-rose-500 bg-rose-100/85",
    tagClass:
      "bg-rose-600 text-white ring-4 ring-rose-200 shadow-xl shadow-rose-950/50",
    surfaceClass:
      "bg-gradient-to-br from-[#3d0a1e] via-[#8f102f] to-[#e23b38] animate-pulse",
    carouselClass:
      "ring-8 ring-rose-400 shadow-[0_0_0_8px_rgba(251,113,133,0.22),0_0_50px_rgba(244,63,94,0.75)]",
  },
};

/**
 * Regra de atenção DA UNIDADE (nunca por pessoa).
 *
 * Thresholds preservados: null ou 31+ dias → urgente; 21+ → critico;
 * 11+ → atencao; demais → em_dia.
 *
 * Novo estado: unidade em IMPLANTACAO com 3+ dias sem contato →
 * "muita_atencao" (laranja). Hierarquia: urgente continua acima
 * (verificado primeiro); INAUGURADA segue exatamente a regra antiga.
 */
export function getContactAttention(
  daysWithoutContact: number | null,
  moment: AttentionMoment = "INAUGURADA",
): ContactAttention {
  if (daysWithoutContact === null || daysWithoutContact >= 31)
    return "urgente";
  if (moment === "IMPLANTACAO" && daysWithoutContact >= 3)
    return "muita_atencao";
  if (daysWithoutContact >= 21) return "critico";
  if (daysWithoutContact >= 11) return "atencao";
  return "em_dia";
}

/**
 * Dias sem contato da UNIDADE.
 *
 * Qualquer Contact válido (todos os tipos, com ou sem pessoa) atualiza a
 * referência — regra preservada. Para unidade em IMPLANTACAO que nunca teve
 * contato, usa o createdAt da unidade como referência inicial
 * (criada dia 20 → dia 21 = 1 dia), nunca retornando null nesse caso.
 * INAUGURADA sem contato mantém null (→ urgente, regra atual).
 */
export function getDaysWithoutContact(input: {
  lastContactedAt?: Date | string | null;
  unitCreatedAt?: Date | string | null;
  moment?: AttentionMoment;
}): number | null {
  const toDays = (value: Date | string) =>
    Math.max(
      0,
      Math.ceil((Date.now() - new Date(value).getTime()) / 86_400_000),
    );
  if (input.lastContactedAt) return toDays(input.lastContactedAt);
  if (input.moment === "IMPLANTACAO" && input.unitCreatedAt)
    return toDays(input.unitCreatedAt);
  return null;
}
