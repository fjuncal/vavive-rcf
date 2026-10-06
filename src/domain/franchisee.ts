import { z } from "zod";

const localPhotoUrl =
  /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|png|webp)$/;
const photoUrlValue = z.string().refine(
  (value) => {
    if (localPhotoUrl.test(value)) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  },
  "URL da foto inválida",
);

// Local upload returns relative URLs; production storage returns absolute URLs.
export const photoUrlSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  photoUrlValue.nullable().optional(),
);

export const franchiseeSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  unitName: z.string().min(2, "Nome da unidade é obrigatório"),
  photoUrl: photoUrlSchema,
  moment: z.enum(["IMPLANTACAO", "INAUGURADA"]),
  active: z.boolean().default(true),
});

export type FranchiseeFormValues = z.infer<typeof franchiseeSchema>;
