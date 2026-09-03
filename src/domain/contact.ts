import { z } from "zod";

export const contactSchema = z.object({
  franchiseeId: z.string().min(1, "Franqueado é obrigatório"),
  type: z.enum(["WHATSAPP", "TELEFONE", "VIDEO_CHAMADA", "PRESENCIAL"]),
  contactedAt: z.string().min(1, "Data do contato é obrigatória"),
  notes: z.string().optional().or(z.literal("")),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
