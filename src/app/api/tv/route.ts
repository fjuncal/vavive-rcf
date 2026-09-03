import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = currentMonthStart;

  const [franchisees, currentQualified, previousQualified, totalFranchisees] = await Promise.all([
    prisma.franchisee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        contacts: {
          orderBy: { contactedAt: "desc" },
        },
      },
    }),
    prisma.contact.findMany({
      where: {
        contactedAt: { gte: currentMonthStart, lt: currentMonthEnd },
        type: { in: ["TELEFONE", "VIDEO_CHAMADA", "PRESENCIAL"] },
      },
      select: { franchiseeId: true, type: true },
    }),
    prisma.contact.count({
      where: {
        contactedAt: { gte: previousMonthStart, lt: previousMonthEnd },
        type: { in: ["TELEFONE", "VIDEO_CHAMADA", "PRESENCIAL"] },
      },
    }),
    prisma.franchisee.count({ where: { active: true } }),
  ]);

  const contactByType = [
    { name: "Telefone", value: currentQualified.filter((contact) => contact.type === "TELEFONE").length },
    { name: "Videochamada", value: currentQualified.filter((contact) => contact.type === "VIDEO_CHAMADA").length },
    { name: "Presencial", value: currentQualified.filter((contact) => contact.type === "PRESENCIAL").length },
  ];

  const uniqueQualifiedFranchisees = new Set(currentQualified.map((contact) => contact.franchiseeId)).size;

  const franchiseeCards = franchisees.map((franchisee) => {
    const monthContacts = franchisee.contacts.filter(
      (contact) => contact.contactedAt >= currentMonthStart && contact.contactedAt < currentMonthEnd,
    );
    const latest = monthContacts[0] ?? franchisee.contacts[0];
    const daysWithoutContact = latest ? Math.max(0, Math.ceil((Date.now() - new Date(latest.contactedAt).getTime()) / (1000 * 60 * 60 * 24))) : null;

    return {
      id: franchisee.id,
      name: franchisee.name,
      unitName: franchisee.unitName,
      photoUrl: franchisee.photoUrl,
      moment: franchisee.moment,
      totalMonth: monthContacts.length,
      whatsapp: monthContacts.filter((contact) => contact.type === "WHATSAPP").length,
      telefone: monthContacts.filter((contact) => contact.type === "TELEFONE").length,
      video: monthContacts.filter((contact) => contact.type === "VIDEO_CHAMADA").length,
      presencial: monthContacts.filter((contact) => contact.type === "PRESENCIAL").length,
      lastContact: latest ? new Date(latest.contactedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : null,
      daysWithoutContact: daysWithoutContact,
      attention: daysWithoutContact === null ? "green" : daysWithoutContact <= 7 ? "green" : daysWithoutContact <= 14 ? "yellow" : "red",
    };
  });

  const payload = {
    monthLabel: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now),
    currentMonth: {
      qualifiedContacts: currentQualified.length,
      contactedFranchisees: uniqueQualifiedFranchisees,
      totalFranchisees: totalFranchisees,
      previousQualifiedContacts: previousQualified,
      byType: contactByType,
      totalQualified: currentQualified.length,
    },
    franchisees: franchiseeCards,
  };

  return NextResponse.json(payload);
}
