import { ContactType, Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const liveInputSchema = z
  .object({
    title: z.string().trim().min(2, "Informe o título da Live.").max(160),
    scheduledAt: z.string().datetime("Informe uma data e horário válidos."),
    hostUserId: z.string().min(1, "Selecione quem realizou a Live."),
    participantIds: z
      .array(z.string().min(1))
      .min(1, "Selecione ao menos um participante."),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (new Set(value.participantIds).size !== value.participantIds.length) {
      context.addIssue({
        code: "custom",
        path: ["participantIds"],
        message: "Há participantes duplicados.",
      });
    }
  });

export type LiveInput = z.infer<typeof liveInputSchema>;
const liveUserRoles: UserRole[] = ["SUPERADMIN", "ADMIN", "SUPPORT"];

function parseInput(input: unknown) {
  return liveInputSchema.parse(input);
}

async function validateReferences(
  tx: Prisma.TransactionClient,
  input: LiveInput,
) {
  const [host, franchisees] = await Promise.all([
    tx.user.findFirst({
      where: {
        id: input.hostUserId,
        active: true,
        role: { in: liveUserRoles },
      },
      select: { id: true },
    }),
    tx.franchisee.findMany({
      where: { id: { in: input.participantIds }, active: true },
      select: { id: true },
    }),
  ]);

  if (!host)
    throw new Error("Selecione um responsável ativo que não seja da TV.");
  if (franchisees.length !== input.participantIds.length) {
    throw new Error(
      "Um ou mais participantes não estão ativos ou não foram encontrados.",
    );
  }
}

function contactData(input: LiveInput) {
  return {
    type: ContactType.LIVE,
    contactedAt: new Date(input.scheduledAt),
    userId: input.hostUserId,
    notes: input.title,
  };
}

export type LiveFilters = {
  search?: string;
  period?: "current_month" | "previous_month" | "last_30_days" | "all";
  hostUserId?: string;
  status?: "scheduled" | "completed" | "all";
};

function periodRange(period: LiveFilters["period"]) {
  const now = new Date();
  if (period === "current_month")
    return {
      gte: new Date(now.getFullYear(), now.getMonth(), 1),
      lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  if (period === "previous_month")
    return {
      gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      lt: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  if (period === "last_30_days")
    return { gte: new Date(now.getTime() - 30 * 86_400_000), lte: now };
  return undefined;
}

export async function listLives(filters: LiveFilters = {}) {
  const now = new Date();
  const where: Prisma.LiveWhereInput = {
    AND: [
      filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              {
                hostUser: {
                  name: { contains: filters.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {},
      filters.hostUserId ? { hostUserId: filters.hostUserId } : {},
      filters.status === "scheduled"
        ? { scheduledAt: { gt: now } }
        : filters.status === "completed"
          ? { scheduledAt: { lte: now } }
          : {},
      periodRange(filters.period)
        ? { scheduledAt: periodRange(filters.period) }
        : {},
    ],
  };
  return prisma.live.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    include: {
      hostUser: { select: { name: true } },
      _count: { select: { participants: true } },
    },
  });
}

export async function getLivesSummary(filters: LiveFilters = {}) {
  const now = new Date();
  const where: Prisma.LiveWhereInput = {
    AND: [
      filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              {
                hostUser: {
                  name: { contains: filters.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {},
      filters.hostUserId ? { hostUserId: filters.hostUserId } : {},
      filters.status === "scheduled"
        ? { scheduledAt: { gt: now } }
        : filters.status === "completed"
          ? { scheduledAt: { lte: now } }
          : {},
      periodRange(filters.period)
        ? { scheduledAt: periodRange(filters.period) }
        : {},
    ],
  };
  const lives = await prisma.live.findMany({
    where,
    select: {
      scheduledAt: true,
      participants: { select: { franchiseeId: true } },
    },
  });
  return {
    count: lives.length,
    participations: lives.reduce(
      (total, live) => total + live.participants.length,
      0,
    ),
    uniqueParticipants: new Set(
      lives.flatMap((live) =>
        live.participants.map((participant) => participant.franchiseeId),
      ),
    ).size,
  };
}

export async function getLiveFormOptions() {
  const [hosts, franchisees] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: { in: liveUserRoles } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.franchisee.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        unitName: true,
        photoUrl: true,
        moment: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);
  return { hosts, franchisees };
}

export async function getLive(id: string) {
  return prisma.live.findUnique({
    where: { id },
    include: {
      hostUser: { select: { id: true, name: true, email: true, role: true } },
      createdByUser: { select: { id: true, name: true } },
      participants: {
        orderBy: { franchisee: { name: "asc" } },
        include: {
          franchisee: {
            select: {
              id: true,
              name: true,
              unitName: true,
              photoUrl: true,
              moment: true,
            },
          },
          contact: {
            select: { id: true, type: true, contactedAt: true, userId: true },
          },
        },
      },
    },
  });
}

export async function createLive(rawInput: unknown, createdByUserId: string) {
  const input = parseInput(rawInput);
  return prisma.$transaction(async (tx) => {
    await validateReferences(tx, input);
    const live = await tx.live.create({
      data: {
        title: input.title,
        scheduledAt: new Date(input.scheduledAt),
        notes: input.notes || null,
        hostUserId: input.hostUserId,
        createdByUserId,
      },
    });

    await Promise.all(
      input.participantIds.map(async (franchiseeId) => {
        const contact = await tx.contact.create({
          data: { franchiseeId, ...contactData(input) },
        });
        await tx.liveParticipant.create({
          data: { liveId: live.id, franchiseeId, contactId: contact.id },
        });
      }),
    );
    return live;
  });
}

export async function updateLive(id: string, rawInput: unknown) {
  const input = parseInput(rawInput);
  return prisma.$transaction(async (tx) => {
    await validateReferences(tx, input);
    const existing = await tx.live.findUnique({
      where: { id },
      include: {
        participants: { select: { franchiseeId: true, contactId: true } },
      },
    });
    if (!existing) throw new Error("Live não encontrada.");

    const wanted = new Set(input.participantIds);
    const existingByFranchisee = new Map(
      existing.participants.map((item) => [item.franchiseeId, item]),
    );
    const toRemove = existing.participants.filter(
      (item) => !wanted.has(item.franchiseeId),
    );
    const toAdd = input.participantIds.filter(
      (franchiseeId) => !existingByFranchisee.has(franchiseeId),
    );
    const toKeep = existing.participants.filter((item) =>
      wanted.has(item.franchiseeId),
    );

    await tx.live.update({
      where: { id },
      data: {
        title: input.title,
        scheduledAt: new Date(input.scheduledAt),
        notes: input.notes || null,
        hostUserId: input.hostUserId,
      },
    });
    await Promise.all(
      toRemove.map((item) =>
        tx.contact.delete({ where: { id: item.contactId } }),
      ),
    );
    await Promise.all(
      toKeep.map((item) =>
        tx.contact.update({
          where: { id: item.contactId },
          data: contactData(input),
        }),
      ),
    );
    await Promise.all(
      toAdd.map(async (franchiseeId) => {
        const contact = await tx.contact.create({
          data: { franchiseeId, ...contactData(input) },
        });
        await tx.liveParticipant.create({
          data: { liveId: id, franchiseeId, contactId: contact.id },
        });
      }),
    );

    return tx.live.findUnique({ where: { id } });
  });
}

export async function deleteLive(id: string) {
  return prisma.$transaction(async (tx) => {
    const live = await tx.live.findUnique({
      where: { id },
      include: { participants: { select: { contactId: true } } },
    });
    if (!live) throw new Error("Live não encontrada.");
    await Promise.all(
      live.participants.map((participant) =>
        tx.contact.delete({ where: { id: participant.contactId } }),
      ),
    );
    await tx.live.delete({ where: { id } });
  });
}
