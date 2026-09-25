import { NextResponse } from "next/server";
import { z } from "zod";
import { OPERATIONS_ROLES, requireAnyRole } from "@/services/auth";
import { prisma } from "@/lib/db";
import { civilDateToUTCDate, isValidCivilDate } from "@/lib/utils";
import { monthlyServiceCountInputSchema } from "@/services/monthly-service-counts";

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

// Lançamento mensal opcional no cadastro (SUPERADMIN): cria a franquia e o
// registro de atendimentos do mês/ano na MESMA transação (rollback conjunto).
const initialMonthlySchema = z
  .object({ monthlyServiceCount: monthlyServiceCountInputSchema })
  .partial();

const schemaWithDates = schema
  .extend({
    joinedNetworkAt: civilDateField,
    inauguratedAt: civilDateField,
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

function monthlyCountForbiddenMessage() {
  return NextResponse.json(
    {
      message:
        "Somente SUPERADMIN pode lançar atendimentos mensais da unidade.",
    },
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

function hasMonthlyCountKey(body: unknown) {
  return (
    typeof body === "object" && body !== null && "monthlyServiceCount" in body
  );
}

function toNullableDate(value: string | undefined): Date | null {
  return value ? civilDateToUTCDate(value) : null;
}

export async function POST(request: Request) {
  const sessionUser = await requireAnyRole(OPERATIONS_ROLES);
  const isSuperAdmin = sessionUser.role === "SUPERADMIN";

  try {
    const body = await request.json();
    if (!isSuperAdmin && hasDateKeys(body)) return datesForbiddenMessage();
    if (!isSuperAdmin && hasMonthlyCountKey(body))
      return monthlyCountForbiddenMessage();
    const payload = (isSuperAdmin ? schemaWithDates : schema).parse(body);
    const initialMonthly = isSuperAdmin
      ? initialMonthlySchema.parse(body).monthlyServiceCount
      : undefined;

    // Unidade nova já nasce com sua pessoa principal (transição compatível:
    // unidades antigas receberam a pessoa via backfill da migration).
    // Lançamento mensal opcional sai na MESMA transação: se falhar, nada é
    // criado pela metade. Nenhum Contact/Ajuste é criado aqui.
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
      if (initialMonthly) {
        await tx.franchiseeMonthlyServiceCount.create({
          data: {
            franchiseeId: created.id,
            year: initialMonthly.year,
            month: initialMonthly.month,
            count: initialMonthly.count,
          },
        });
      }
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
    if (!isSuperAdmin && hasMonthlyCountKey(body))
      return monthlyCountForbiddenMessage();
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
