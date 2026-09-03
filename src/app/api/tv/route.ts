import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/services/auth";
import { CONTACT_ATTENTION, QUALIFIED_CONTACT_TYPES } from "@/lib/constants";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Sessão expirada. Entre novamente." }, { status: 401 });
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const franchisees = await prisma.franchisee.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unitName: true, photoUrl: true, moment: true } });
  const ids = franchisees.map((item) => item.id);
  const [monthContacts, latestContacts, previousQualified] = await Promise.all([
    prisma.contact.findMany({ where: { franchiseeId: { in: ids }, contactedAt: { gte: currentMonthStart, lt: currentMonthEnd } }, select: { franchiseeId: true, type: true } }),
    prisma.contact.groupBy({ by: ["franchiseeId"], where: { franchiseeId: { in: ids } }, _max: { contactedAt: true } }),
    prisma.contact.count({ where: { contactedAt: { gte: previousMonthStart, lt: currentMonthStart }, type: { in: QUALIFIED_CONTACT_TYPES } } }),
  ]);
  const monthlyByFranchisee = new Map<string, typeof monthContacts>();
  for (const contact of monthContacts) monthlyByFranchisee.set(contact.franchiseeId, [...(monthlyByFranchisee.get(contact.franchiseeId) ?? []), contact]);
  const lastContactByFranchisee = new Map(latestContacts.map((item) => [item.franchiseeId, item._max.contactedAt]));
  const qualified = monthContacts.filter((contact) => QUALIFIED_CONTACT_TYPES.includes(contact.type));
  const countType = (type: string) => monthContacts.filter((contact) => contact.type === type).length;
  return NextResponse.json({
    monthLabel: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now),
    currentMonth: { qualifiedContacts: qualified.length, contactedFranchisees: new Set(qualified.map((contact) => contact.franchiseeId)).size, totalFranchisees: franchisees.length, previousQualifiedContacts: previousQualified, byType: [{ name: "Telefone", value: countType("TELEFONE") }, { name: "Videochamada", value: countType("VIDEO_CHAMADA") }, { name: "Presencial", value: countType("PRESENCIAL") }], totalQualified: qualified.length },
    franchisees: franchisees.map((franchisee) => {
      const contacts = monthlyByFranchisee.get(franchisee.id) ?? [];
      const latest = lastContactByFranchisee.get(franchisee.id);
      const daysWithoutContact = latest ? Math.max(0, Math.ceil((Date.now() - latest.getTime()) / 86_400_000)) : null;
      const count = (type: string) => contacts.filter((contact) => contact.type === type).length;
      return { id: franchisee.id, name: franchisee.name, unitName: franchisee.unitName, photoUrl: franchisee.photoUrl, moment: franchisee.moment, totalMonth: contacts.length, whatsapp: count("WHATSAPP"), telefone: count("TELEFONE"), video: count("VIDEO_CHAMADA"), presencial: count("PRESENCIAL"), lastContact: latest ? latest.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : null, daysWithoutContact, attention: daysWithoutContact === null ? "red" : daysWithoutContact <= CONTACT_ATTENTION.warningAfterDays ? "green" : daysWithoutContact <= CONTACT_ATTENTION.dangerAfterDays ? "yellow" : "red" };
    }),
  });
}
