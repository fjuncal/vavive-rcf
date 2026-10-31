import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { OPERATIONS_ROLES, requireAnyRole } from "@/services/auth";
import { prisma } from "@/lib/db";
import { civilDateToUTCDate, isValidCivilDate } from "@/lib/utils";
import { monthlyServiceCountInputSchema } from "@/services/monthly-service-counts";
import { photoUrlSchema } from "@/domain/franchisee";
import { birthDateSchema, birthDateToUTCDate } from "@/domain/birthdays";
import {
  getPrimaryMemberId,
  getPrimarySwapDates,
  validatePrimaryMemberSelection,
} from "@/domain/franchisee-members";

const schema = z.object({
  name: z.string("Nome é obrigatório.").min(2, "Nome é obrigatório."),
  unitName: z
    .string("Nome da unidade é obrigatório.")
    .min(2, "Nome da unidade é obrigatório."),
  photoUrl: photoUrlSchema,
  primaryMemberBirthDate: birthDateSchema,
  primaryMemberId: z.string().min(1).optional(),
  moment: z.enum(["IMPLANTACAO", "INAUGURADA"], "Momento da unidade inválido."),
  active: z.boolean("Status da unidade inválido.").default(true),
});

// Datas civis da unidade (YYYY-MM-DD, opcionais, "" = limpar).
// Somente SUPERADMIN pode enviá-las (validado no handler, não só no front).
function civilDateField(label: string) {
  const message = `${label} inválida.`;
  return z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string(message)
      .refine(isValidCivilDate, { message })
      .nullable()
      .optional(),
  );
}

// Lançamento mensal opcional no cadastro (SUPERADMIN): cria a franquia e o
// registro de atendimentos do mês/ano na MESMA transação (rollback conjunto).
const initialMonthlySchema = z
  .object({ monthlyServiceCount: monthlyServiceCountInputSchema })
  .partial();

const schemaWithDates = schema
  .extend({
    joinedNetworkAt: civilDateField("Data de entrada na rede"),
    inauguratedAt: civilDateField("Data de inauguração"),
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

function toNullableDate(value: string | null | undefined): Date | null {
  return value ? civilDateToUTCDate(value) : null;
}

const validationFieldMessages: Record<string, string> = {
  name: "Nome é obrigatório.",
  unitName: "Nome da unidade é obrigatório.",
  photoUrl: "URL da foto inválida.",
  moment: "Momento da unidade inválido.",
  active: "Status da unidade inválido.",
  joinedNetworkAt: "Data de entrada na rede inválida.",
  inauguratedAt: "Data de inauguração inválida.",
};

function validationMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (issue?.message && !issue.message.startsWith("Invalid input"))
    return issue.message;
  const field = issue?.path[0];
  if (typeof field === "string" && validationFieldMessages[field])
    return validationFieldMessages[field];
  return "Dados inválidos.";
}

class PrimaryChangeError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
  }
}

function primaryChangeMessage(reason: ReturnType<typeof validatePrimaryMemberSelection>) {
  switch (reason) {
    case "member_not_found":
      return "Responsável não encontrado.";
    case "member_not_in_unit":
      return "O responsável selecionado não pertence a esta unidade.";
    case "member_inactive":
      return "Responsável inativo não pode ser principal.";
    default:
      return "Responsável principal inválido.";
  }
}

export async function GET() {
  // Lista enxuta para o seletor "Unidade existente" de /franqueados/new.
  // Mesma permissão de criação (OPERATIONS_ROLES): backend é autoridade.
  // Ativas primeiro, ordem alfabética por unidade; inclui membros para o
  // card de contexto (evita N+1 no front). Somente leitura, sem alterações.
  await requireAnyRole(OPERATIONS_ROLES);

  const franchisees = await prisma.franchisee.findMany({
    orderBy: [{ active: "desc" }, { unitName: "asc" }],
    select: {
      id: true,
      unitName: true,
      name: true,
      moment: true,
      active: true,
      members: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json(franchisees);
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

    // Auditoria de duplicidade EXATA do nome da unidade (aplicação, sem
    // migration/constraint): trim + case-insensitive. Ex.: "Vitória" e
    // " vitória " colidem. NÃO é fuzzy: nomes apenas parecidos passam.
    // Limitação documentada: sem constraint única há janela de race
    // condition entre a checagem e o create; o aviso é amigável (409) e
    // orienta a usar o fluxo "Unidade existente".
    // Tabela pequena (~100 unidades): varredura em memória é suficiente.
    const normalizedUnitName = payload.unitName.trim().toLocaleLowerCase("pt-BR");
    if (normalizedUnitName) {
      const siblings = await prisma.franchisee.findMany({
        select: { unitName: true },
      });
      const duplicate = siblings.some(
        (sibling) =>
          sibling.unitName.trim().toLocaleLowerCase("pt-BR") ===
          normalizedUnitName,
      );
      if (duplicate) {
        return NextResponse.json(
          {
            message:
              "Já existe uma unidade com este nome. Você pode adicionar o franqueado à unidade existente.",
          },
          { status: 409 },
        );
      }
    }

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
          ...(payload.primaryMemberBirthDate !== undefined
            ? { birthDate: birthDateToUTCDate(payload.primaryMemberBirthDate) }
            : {}),
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
        { message: validationMessage(error) },
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
    const franchisee = await prisma.$transaction(
      async (tx) => {
        const members = await tx.franchiseeMember.findMany({
          where: { franchiseeId: id },
          select: {
            id: true,
            franchiseeId: true,
            name: true,
            photoUrl: true,
            birthDate: true,
            active: true,
            createdAt: true,
          },
        });
        const currentPrimaryId = getPrimaryMemberId(members);
        const requestedPrimaryId = payload.primaryMemberId ?? currentPrimaryId;

        if (
          payload.primaryMemberId &&
          payload.primaryMemberId !== currentPrimaryId
        ) {
          const requestedMember = await tx.franchiseeMember.findUnique({
            where: { id: payload.primaryMemberId },
            select: { id: true, franchiseeId: true, active: true },
          });
          const reason = validatePrimaryMemberSelection({
            memberExists: Boolean(requestedMember),
            memberFranchiseeId: requestedMember?.franchiseeId ?? null,
            franchiseeId: id,
            memberActive: requestedMember?.active ?? false,
          });
          if (reason) {
            const status =
              reason === "member_not_found"
                ? 404
                : 400;
            throw new PrimaryChangeError(primaryChangeMessage(reason), status);
          }
        }

        const primaryMember = members.find(
          (member) => member.id === currentPrimaryId,
        );
        const selectedMember = members.find(
          (member) => member.id === requestedPrimaryId,
        );
        if (requestedPrimaryId && !selectedMember) {
          throw new PrimaryChangeError(
            "O responsável selecionado não pertence a esta unidade.",
            400,
          );
        }

        const primaryMemberData = {
          name: payload.name,
          photoUrl: payload.photoUrl || null,
          ...(payload.primaryMemberBirthDate !== undefined
            ? {
                birthDate: birthDateToUTCDate(payload.primaryMemberBirthDate),
              }
            : {}),
        };

        if (
          primaryMember &&
          selectedMember &&
          primaryMember.id !== selectedMember.id
        ) {
          const swapDates = getPrimarySwapDates(primaryMember, selectedMember);
          await tx.franchiseeMember.update({
            where: { id: selectedMember.id },
            data: {
              ...primaryMemberData,
              createdAt: swapDates.promotedCreatedAt,
            },
          });
          await tx.franchiseeMember.update({
            where: { id: primaryMember.id },
            data: { createdAt: swapDates.demotedCreatedAt },
          });
        } else if (primaryMember) {
          await tx.franchiseeMember.update({
            where: { id: primaryMember.id },
            data: primaryMemberData,
          });
        }

        return tx.franchisee.update({
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json(franchisee);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { message: validationMessage(error) },
        { status: 400 },
      );
    if (error instanceof PrimaryChangeError)
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      return NextResponse.json(
        { message: "A alteração sofreu uma concorrência. Tente novamente." },
        { status: 409 },
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
