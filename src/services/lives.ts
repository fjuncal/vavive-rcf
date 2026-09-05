import { ContactType, Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const liveInputSchema = z
  .object({
    title: z.string().trim().min(2, "Informe o título da Live.").max(160),
    scheduledAt: z.string().datetime("Informe uma data e horário válidos."),
    hostUserId: z.string().min(1, "Selecione quem realizou a Live."),
    guestIds: z
      .array(z.string().min(1))
      .min(1, "Selecione ao menos um convidado."),
    attendeeIds: z.array(z.string().min(1)).default([]),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (new Set(value.guestIds).size !== value.guestIds.length) {
      context.addIssue({
        code: "custom",
        path: ["guestIds"],
        message: "Há convidados duplicados.",
      });
    }
    if (new Set(value.attendeeIds).size !== value.attendeeIds.length) {
      context.addIssue({
        code: "custom",
        path: ["attendeeIds"],
        message: "Há presenças duplicadas.",
      });
    }
    if (value.attendeeIds.some((id) => !value.guestIds.includes(id))) {
      context.addIssue({
        code: "custom",
        path: ["attendeeIds"],
        message: "Todos os presentes precisam estar na lista de convidados.",
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
      where: { id: { in: input.guestIds }, active: true },
      select: { id: true },
    }),
  ]);

  if (!host)
    throw new Error("Selecione um responsável ativo que não seja da TV.");
  if (franchisees.length !== input.guestIds.length) {
    throw new Error(
      "Um ou mais convidados não estão ativos ou não foram encontrados.",
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

async function createParticipation(
  tx: Prisma.TransactionClient,
  liveId: string,
  franchiseeId: string,
  attended: boolean,
  input: LiveInput,
) {
  const contact = attended
    ? await tx.contact.create({
        data: { franchiseeId, ...contactData(input) },
      })
    : null;
  return tx.liveParticipant.create({
    data: {
      liveId,
      franchiseeId,
      attended,
      contactId: contact?.id,
    },
  });
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

function livesWhere(filters: LiveFilters): Prisma.LiveWhereInput {
  const now = new Date();
  const range = periodRange(filters.period);
  return {
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
      range ? { scheduledAt: range } : {},
    ],
  };
}

export async function listLives(filters: LiveFilters = {}) {
  return prisma.live.findMany({
    where: livesWhere(filters),
    orderBy: { scheduledAt: "desc" },
    include: {
      hostUser: { select: { name: true } },
      participants: { select: { attended: true } },
    },
  });
}

export async function getLivesSummary(filters: LiveFilters = {}) {
  const where = livesWhere(filters);
  const [count, attendees] = await Promise.all([
    prisma.live.count({ where }),
    prisma.liveParticipant.findMany({
      where: { attended: true, live: { is: where } },
      select: { franchiseeId: true },
    }),
  ]);
  return {
    count,
    participations: attendees.length,
    uniqueParticipants: new Set(attendees.map((item) => item.franchiseeId))
      .size,
  };
}

export function getNextScheduledLive() {
  return prisma.live.findFirst({
    where: { scheduledAt: { gt: new Date() } },
    orderBy: { scheduledAt: "asc" },
    select: { title: true, scheduledAt: true },
  });
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

    const attendees = new Set(input.attendeeIds);
    await Promise.all(
      input.guestIds.map((franchiseeId) =>
        createParticipation(
          tx,
          live.id,
          franchiseeId,
          attendees.has(franchiseeId),
          input,
        ),
      ),
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
        participants: {
          select: {
            id: true,
            franchiseeId: true,
            contactId: true,
            attended: true,
          },
        },
      },
    });
    if (!existing) throw new Error("Live não encontrada.");

    const guests = new Set(input.guestIds);
    const attendees = new Set(input.attendeeIds);
    const existingByFranchisee = new Map(
      existing.participants.map((item) => [item.franchiseeId, item]),
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

    for (const participant of existing.participants) {
      if (!guests.has(participant.franchiseeId)) {
        if (participant.contactId)
          await tx.contact.delete({ where: { id: participant.contactId } });
        await tx.liveParticipant.delete({ where: { id: participant.id } });
        continue;
      }

      const attended = attendees.has(participant.franchiseeId);
      if (attended && !participant.contactId) {
        const contact = await tx.contact.create({
          data: {
            franchiseeId: participant.franchiseeId,
            ...contactData(input),
          },
        });
        await tx.liveParticipant.update({
          where: { id: participant.id },
          data: { attended: true, contactId: contact.id },
        });
      } else if (!attended && participant.contactId) {
        await tx.contact.delete({ where: { id: participant.contactId } });
        await tx.liveParticipant.update({
          where: { id: participant.id },
          data: { attended: false, contactId: null },
        });
      } else if (attended && participant.contactId) {
        await tx.contact.update({
          where: { id: participant.contactId },
          data: contactData(input),
        });
        await tx.liveParticipant.update({
          where: { id: participant.id },
          data: { attended: true },
        });
      } else if (participant.attended) {
        await tx.liveParticipant.update({
          where: { id: participant.id },
          data: { attended: false },
        });
      }
    }

    for (const franchiseeId of input.guestIds) {
      if (!existingByFranchisee.has(franchiseeId)) {
        await createParticipation(
          tx,
          id,
          franchiseeId,
          attendees.has(franchiseeId),
          input,
        );
      }
    }

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
      live.participants
        .filter((participant) => participant.contactId)
        .map((participant) =>
          tx.contact.delete({ where: { id: participant.contactId! } }),
        ),
    );
    await tx.live.delete({ where: { id } });
  });
}
