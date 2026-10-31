import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  getPrimaryMemberId,
  getTransferredSecondaryCreatedAt,
  validateSecondaryMemberTransfer,
} from "@/domain/franchisee-members";
import { prisma } from "@/lib/db";
import { getSessionUser, hasAnyRole, OPERATIONS_ROLES } from "@/services/auth";
import { toDateInputValue } from "@/lib/utils";

const transferSchema = z.object({
  destinationFranchiseeId: z.string().trim().min(1, "Selecione a unidade de destino."),
});

const memberSelect = {
  id: true,
  franchiseeId: true,
  name: true,
  photoUrl: true,
  birthDate: true,
  active: true,
  createdAt: true,
} as const;

class TransferError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
  }
}

function serializeMember(member: {
  id: string;
  franchiseeId: string;
  name: string;
  photoUrl: string | null;
  birthDate: Date | null;
  active: boolean;
  createdAt: Date;
}) {
  return { ...member, birthDate: toDateInputValue(member.birthDate) || null };
}

function transferMessage(reason: ReturnType<typeof validateSecondaryMemberTransfer>) {
  switch (reason) {
    case "member_not_in_origin":
      return "O responsável não pertence à unidade de origem.";
    case "primary_member_protected":
      return "O responsável principal não pode ser transferido por este fluxo.";
    case "destination_not_found":
      return "Unidade de destino não encontrada.";
    case "same_destination":
      return "A unidade de destino deve ser diferente da origem.";
    case "member_already_in_destination":
      return "O responsável já está associado à unidade de destino.";
    default:
      return "Transferência inválida.";
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }
  if (!hasAnyRole(user, OPERATIONS_ROLES)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  let payload: z.infer<typeof transferSchema>;
  try {
    payload = transferSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? error.issues[0]?.message || "Dados inválidos."
            : "Dados inválidos.",
      },
      { status: 400 },
    );
  }

  const { id: originFranchiseeId, memberId } = await params;
  try {
    const member = await prisma.$transaction(
      async (tx) => {
        const [originMember, destination] = await Promise.all([
          tx.franchiseeMember.findFirst({
            where: { id: memberId, franchiseeId: originFranchiseeId },
            select: { id: true, franchiseeId: true },
          }),
          tx.franchisee.findUnique({
            where: { id: payload.destinationFranchiseeId },
            select: { id: true },
          }),
        ]);

        if (!originMember) {
          throw new TransferError(
            "Responsável não encontrado nesta unidade.",
            404,
          );
        }

        const originMembers = await tx.franchiseeMember.findMany({
          where: { franchiseeId: originFranchiseeId },
          select: { id: true, createdAt: true },
        });
        const destinationMembers = destination
          ? await tx.franchiseeMember.findMany({
              where: { franchiseeId: destination.id },
              select: { id: true, createdAt: true },
            })
          : [];
        const duplicate = destinationMembers.find((item) => item.id === memberId);
        const reason = validateSecondaryMemberTransfer({
          memberId,
          originFranchiseeId,
          memberFranchiseeId: originMember.franchiseeId,
          primaryMemberId: getPrimaryMemberId(originMembers),
          destinationFranchiseeId: destination?.id ?? null,
          destinationHasMember: Boolean(duplicate),
        });
        if (reason) {
          const status =
            reason === "primary_member_protected" ||
            reason === "member_already_in_destination"
              ? 409
              : reason === "destination_not_found" ||
                  reason === "member_not_in_origin"
                ? 404
                : 400;
          throw new TransferError(transferMessage(reason), status);
        }

        const transferredCreatedAt =
          getTransferredSecondaryCreatedAt(destinationMembers);
        return tx.franchiseeMember.update({
          where: { id: memberId },
          data: {
            franchiseeId: destination!.id,
            // Principal is derived from order. Preserve secondary role after move.
            ...(transferredCreatedAt ? { createdAt: transferredCreatedAt } : {}),
          },
          select: memberSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json(serializeMember(member));
  } catch (error) {
    if (error instanceof TransferError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json(
        { message: "A transferência sofreu uma concorrência. Tente novamente." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: "Não foi possível transferir o responsável." },
      { status: 500 },
    );
  }
}
