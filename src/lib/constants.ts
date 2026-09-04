import type { ContactType } from "@prisma/client";
export const CONTACT_TYPE_LABELS = {
  WHATSAPP: "WhatsApp",
  TELEFONE: "Telefone",
  VIDEO_CHAMADA: "Vídeo",
  PRESENCIAL: "Presencial",
  LIVE: "Live",
} as const;
export const QUALIFIED_CONTACT_TYPES: ContactType[] = [
  "TELEFONE",
  "VIDEO_CHAMADA",
  "PRESENCIAL",
  "LIVE",
];
export const CONTACT_ATTENTION = {
  warningAfterDays: 7,
  dangerAfterDays: 14,
} as const;
export const FRANCHISE_MOMENT_LABELS = {
  IMPLANTACAO: "Implantação",
  INAUGURADA: "Inaugurada",
} as const;
export const TV_AUTOPLAY_SECONDS = 30;
export const TV_REFRESH_SECONDS = 60;
export const TV_ACCOUNT_EMAIL = "tv@vavive.local";
