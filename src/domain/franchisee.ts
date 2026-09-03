import { z } from "zod";

export const franchiseeSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  unitName: z.string().min(2, "Nome da unidade é obrigatório"),
  photoUrl: z.string().url("URL da foto inválida").optional().or(z.literal("")),
  moment: z.enum(["IMPLANTACAO", "INAUGURADA"]),
  active: z.boolean().default(true),
});

export type FranchiseeFormValues = z.infer<typeof franchiseeSchema>;
