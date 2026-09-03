import { prisma } from "@/lib/db";
import type { ContactType, FranchiseMoment } from "@/types";

export async function getFranchisees() {
  return prisma.franchisee.findMany({
    orderBy: { name: "asc" },
    include: {
      contacts: {
        orderBy: { contactedAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getFranchiseeById(id: string) {
  return prisma.franchisee.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: { contactedAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });
}

export async function createFranchisee(input: {
  name: string;
  unitName: string;
  photoUrl?: string | null;
  moment: FranchiseMoment;
  active: boolean;
}) {
  return prisma.franchisee.create({ data: input });
}

export async function getQualifiedContactsForMonth(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return prisma.contact.groupBy({
    by: ["type"],
    where: {
      contactedAt: {
        gte: monthStart,
        lt: monthEnd,
      },
      type: {
        in: ["TELEFONE", "VIDEO_CHAMADA", "PRESENCIAL"],
      },
    },
    _count: true,
  });
}

export async function countContactsForMonth(date: Date, type?: ContactType) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return prisma.contact.count({
    where: {
      contactedAt: {
        gte: monthStart,
        lt: monthEnd,
      },
      ...(type ? { type } : {}),
    },
  });
}
