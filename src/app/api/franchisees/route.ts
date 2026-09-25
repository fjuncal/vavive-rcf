import { NextResponse } from "next/server";
import { z } from "zod";
import { OPERATIONS_ROLES, requireAnyRole } from "@/services/auth";
import { prisma } from "@/lib/db";
import { civilDateToUTCDate, isValidCivilDate } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2),
  unitName: z.string().min(2),
  photoUrl: z.string().url().optional().or(z.literal("")),
  moment: z.enum(["IMPLANTACAO", "INAUGURADA"]),
  active: z.boolean().default(true),
});

// Datas civis da unidade (YYYY-MM-DD, opcionais, "" = limpar).
// Somente SUPERADMIN pode enviá-las (validado no handler, não só no front).
const civilDateField = z
  .string()
  .refine((value) => value === "" || isValidCivilDate(value), {
    message: "Informe uma data válida (AAAA-MM-DD).",
  })
  .optional()
  .or(z.literal(""));

// Quantidade MANUAL de atendimentos da unidade (inteiro 0..1000000).
// "" / null / ausente = limpar (null). 0 é válido e permanece 0.
// Somente SUPERADMIN pode enviá-lo (validado no handler, não só no front).
// Validação estrita: não aceita decimais, negativos nem lixo como "12abc".
const serviceCountField = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .refine(
    (value) => {
      if (value === undefined || value === null) return true;
      if (typeof value === "number")
        return Number.isInteger(value) && value >= 0 && value <= 1000000;
      const trimmed = value.trim();
      return (
        trimmed === "" ||
        (/^\d+$/.test(trimmed) && Number(trimmed) <= 1000000)
      );
    },
    { message: "Atendimentos deve ser um número inteiro entre 0 e 1000000." },
  );

const schemaWithDates = schema
  .extend({
    joinedNetworkAt: civilDateField,
    inauguratedAt: civilDateField,
    serviceCount: serviceCountField,
  })
  .superRefine((value, context) => {
    if (
      value.joinedNetworkAt &&
      value.inauguratedAt &&
      value.inauguratedAt < value.joinedNetworkAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["inauguratedAt"],
        message: "A inauguração não pode ser anterior à entrada na rede.",
      });
    }
  });

function datesForbiddenMessage() {
  return NextResponse.json(
    { message: "Somente SUPERADMIN pode alterar as datas da unidade." },
    { status: 403 },
  );
}

function serviceCountForbiddenMessage() {
  return NextResponse.json(
    { message: "Somente SUPERADMIN pode alterar os atendimentos da unidade." },
    { status: 403 },
  );
}

function hasDateKeys(body: unknown) {
  return (
    typeof body === "object" &&
    body !== null &&
    ("joinedNetworkAt" in body || "inauguratedAt" in body)
  );
}

function hasServiceCountKey(body: unknown) {
  return (
    typeof body === "object" && body !== null && "serviceCount" in body
  );
}

function toNullableDate(value: string | undefined): Date | null {
  return value ? civilDateToUTCDate(value) : null;
}

function toNullableCount(
  value: number | string | null | undefined,
): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export async function POST(request: Request) {
  const sessionUser = await requireAnyRole(OPERATIONS_ROLES);
  const isSuperAdmin = sessionUser.role === "SUPERADMIN";

  try {
    const body = await request.json();
    if (!isSuperAdmin && hasDateKeys(body)) return datesForbiddenMessage();
    if (!isSuperAdmin && hasServiceCountKey(body))
      return serviceCountForbiddenMessage();
    const payload = (isSuperAdmin ? schemaWithDates : schema).parse(body);

    // Unidade nova já nasce com sua pessoa principal (transição compatível:
    // unidades antigas receberam a pessoa via backfill da migration).
    const franchisee = await prisma.$transaction(async (tx) => {
      const created = await tx.franchisee.create({
        data: {
          name: payload.name,
          unitName: payload.unitName,
          photoUrl: payload.photoUrl || null,
          moment: payload.moment,
          active: payload.active,
          ...(isSuperAdmin
            ? {
                joinedNetworkAt: toNullableDate(
                  (payload as { joinedNetworkAt?: string }).joinedNetworkAt,
                ),
                inauguratedAt: toNullableDate(
                  (payload as { inauguratedAt?: string }).inauguratedAt,
                ),
                serviceCount: toNullableCount(
                  (
                    payload as {
                      serviceCount?: number | string | null;
                    }
                  ).serviceCount,
                ),
              }
            : {}),
        },
      });
      await tx.franchiseeMember.create({
        data: {
          franchiseeId: created.id,
          name: payload.name,
          photoUrl: payload.photoUrl || null,
          active: payload.active,
        },
      });
      return created;
    });

    return NextResponse.json(franchisee, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Dados inválidos." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Erro ao criar franqueado." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const sessionUser = await requireAnyRole(OPERATIONS_ROLES);
  const isSuperAdmin = sessionUser.role === "SUPERADMIN";
  try {
    const body = await request.json();
    const id = String(body.id || "");
    if (!isSuperAdmin && hasDateKeys(body)) return datesForbiddenMessage();
    if (!isSuperAdmin && hasServiceCountKey(body))
      return serviceCountForbiddenMessage();
    const payload = (isSuperAdmin ? schemaWithDates : schema).parse(body);
    const franchisee = await prisma.franchisee.update({
      where: { id },
      data: {
        name: payload.name,
        unitName: payload.unitName,
        photoUrl: payload.photoUrl || null,
        moment: payload.moment,
        active: payload.active,
        ...(isSuperAdmin
          ? {
              joinedNetworkAt: toNullableDate(
                (payload as z.infer<typeof schemaWithDates>).joinedNetworkAt,
              ),
              inauguratedAt: toNullableDate(
                (payload as z.infer<typeof schemaWithDates>).inauguratedAt,
              ),
              serviceCount: toNullableCount(
                (payload as z.infer<typeof schemaWithDates>).serviceCount,
              ),
            }
          : {}),
      },
    });
    // Transição compatível: Franchisee.name/photoUrl continuam sendo a
    // referência da pessoa principal; espelha na pessoa mais antiga.
    const primary = await prisma.franchiseeMember.findFirst({
      where: { franchiseeId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (primary) {
      await prisma.franchiseeMember.update({
        where: { id: primary.id },
        data: { name: payload.name, photoUrl: payload.photoUrl || null },
      });
    }
    return NextResponse.json(franchisee);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { message: error.issues[0]?.message },
        { status: 400 },
      );
    return NextResponse.json(
      { message: "Erro ao editar franqueado." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  await requireAnyRole(["SUPERADMIN"]);

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json(
        { message: "Franqueado inválido." },
        { status: 400 },
      );
    }

    await prisma.franchisee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Este franqueado não foi encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Não foi possível remover o franqueado." },
      { status: 500 },
    );
  }
}
