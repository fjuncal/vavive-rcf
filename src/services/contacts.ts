import { prisma } from "@/lib/db";
import type { ContactType } from "@/types";

export async function createContact(input: {
  franchiseeId: string;
  userId: string;
  type: ContactType;
  contactedAt: Date;
  notes?: string | null;
}) {
  return prisma.contact.create({
    data: input,
    include: {
      user: { select: { name: true } },
      franchisee: true,
    },
  });
}

export async function getContactsForMonth(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return prisma.contact.findMany({
    where: {
      contactedAt: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
    orderBy: { contactedAt: "desc" },
    include: {
      franchisee: true,
      user: { select: { name: true } },
    },
  });
}

export async function getMonthlySummary(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  const [contacts, franchisees, qualified] = await Promise.all([
    prisma.contact.groupBy({
      by: ["type"],
      where: { contactedAt: { gte: monthStart, lt: monthEnd } },
      _count: true,
    }),
    prisma.franchisee.count({
      where: { active: true },
    }),
    prisma.contact.findMany({
      where: {
        contactedAt: { gte: monthStart, lt: monthEnd },
        type: { in: ["TELEFONE", "VIDEO_CHAMADA", "PRESENCIAL"] },
      },
      select: { franchiseeId: true },
    }),
  ]);

  const uniqueFranchisees = new Set(qualified.map((item) => item.franchiseeId)).size;

  return {
    contactsByType: contacts,
    activeFranchisees: franchisees,
    qualifiedContacts: qualified.length,
    contactedFranchisees: uniqueFranchisees,
  };
}
