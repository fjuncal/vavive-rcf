export type ContactAttention = "em_dia" | "atencao" | "critico" | "urgente";

export const CONTACT_ATTENTION_CONFIG: Record<
  ContactAttention,
  {
    label: string;
    emoji: string;
    carouselSeconds: number;
    listClass: string;
    tagClass: string;
    carouselClass: string;
  }
> = {
  em_dia: {
    label: "Em dia",
    emoji: "✓",
    carouselSeconds: 12,
    listClass: "border-emerald-300 bg-emerald-50/70",
    tagClass: "bg-emerald-600 text-white shadow-lg shadow-emerald-950/20",
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
    carouselClass: "ring-4 ring-amber-300 shadow-2xl shadow-amber-500/25",
  },
  critico: {
    label: "Atenção máxima",
    emoji: "⚠",
    carouselSeconds: 32,
    listClass: "border-red-300 bg-red-50/75",
    tagClass:
      "bg-red-600 text-white ring-2 ring-red-200 shadow-lg shadow-red-950/35",
    carouselClass: "ring-4 ring-red-400 shadow-2xl shadow-red-600/35",
  },
  urgente: {
    label: "Urgente",
    emoji: "🚨",
    carouselSeconds: 50,
    listClass: "border-rose-500 bg-rose-100/85",
    tagClass:
      "bg-rose-600 text-white ring-4 ring-rose-200 shadow-xl shadow-rose-950/50",
    carouselClass:
      "ring-8 ring-rose-400 shadow-[0_0_0_8px_rgba(251,113,133,0.22),0_0_50px_rgba(244,63,94,0.75)]",
  },
};

export function getContactAttention(
  daysWithoutContact: number | null,
): ContactAttention {
  if (daysWithoutContact === null || daysWithoutContact >= 31) return "urgente";
  if (daysWithoutContact >= 21) return "critico";
  if (daysWithoutContact >= 11) return "atencao";
  return "em_dia";
}
