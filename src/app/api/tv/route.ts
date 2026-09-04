import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/services/auth";
import { QUALIFIED_CONTACT_TYPES } from "@/lib/constants";
import { getContactAttention } from "@/lib/contact-attention";

type TVPeriod =
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "current_month"
  | "previous_month";

const periodLabels: Record<TVPeriod, string> = {
  last_7_days: "Últimos 7 dias",
  last_30_days: "Últimos 30 dias",
  last_90_days: "Últimos 90 dias",
  current_month: "Mês atual",
  previous_month: "Mês anterior",
};

function parsePeriod(value: string | null): TVPeriod {
  return value && value in periodLabels ? (value as TVPeriod) : "last_30_days";
}

function periodRange(period: TVPeriod) {
  const now = new Date();
  if (period === "last_7_days")
    return { gte: new Date(now.getTime() - 7 * 86_400_000), lte: now };
  if (period === "last_90_days")
    return { gte: new Date(now.getTime() - 90 * 86_400_000), lte: now };
  if (period === "current_month")
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte: now };
  if (period === "previous_month")
    return {
      gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      lt: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  return { gte: new Date(now.getTime() - 30 * 86_400_000), lte: now };
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { message: "Sessão expirada. Entre novamente." },
      { status: 401 },
    );

  const period = parsePeriod(request.nextUrl.searchParams.get("period"));
  const range = periodRange(period);
  const franchisees = await prisma.franchisee.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      unitName: true,
      photoUrl: true,
      moment: true,
    },
  });
  const ids = franchisees.map((item) => item.id);
  const [periodContacts, latestContacts, participations] = await Promise.all([
    prisma.contact.findMany({
      where: {
        franchiseeId: { in: ids },
        contactedAt: range,
      },
      select: { franchiseeId: true, type: true },
    }),
    prisma.contact.groupBy({
      by: ["franchiseeId"],
      where: { franchiseeId: { in: ids } },
      _max: { contactedAt: true },
    }),
    prisma.liveParticipant.findMany({
      where: {
        franchiseeId: { in: ids },
        live: { scheduledAt: range },
      },
      select: { franchiseeId: true, attended: true },
    }),
  ]);

  const contactsByFranchisee = new Map<string, typeof periodContacts>();
  for (const contact of periodContacts)
    contactsByFranchisee.set(contact.franchiseeId, [
      ...(contactsByFranchisee.get(contact.franchiseeId) ?? []),
      contact,
    ]);

  const participationByFranchisee = new Map<
    string,
    { invited: number; attended: number }
  >();
  for (const participant of participations) {
    const current = participationByFranchisee.get(participant.franchiseeId) ?? {
      invited: 0,
      attended: 0,
    };
    current.invited++;
    if (participant.attended) current.attended++;
    participationByFranchisee.set(participant.franchiseeId, current);
  }

  const lastContactByFranchisee = new Map(
    latestContacts.map((item) => [item.franchiseeId, item._max.contactedAt]),
  );
  const qualified = periodContacts.filter((contact) =>
    QUALIFIED_CONTACT_TYPES.includes(contact.type),
  );
  const countType = (type: string) =>
    periodContacts.filter((contact) => contact.type === type).length;

  return NextResponse.json({
    period,
    periodLabel: periodLabels[period],
    currentMonth: {
      qualifiedContacts: qualified.length,
      contactedFranchisees: new Set(
        qualified.map((contact) => contact.franchiseeId),
      ).size,
      totalFranchisees: franchisees.length,
      byType: [
        { name: "Telefone", value: countType("TELEFONE") },
        { name: "Videochamada", value: countType("VIDEO_CHAMADA") },
        { name: "Presencial", value: countType("PRESENCIAL") },
        { name: "Live", value: countType("LIVE") },
      ],
      totalQualified: qualified.length,
    },
    franchisees: franchisees.map((franchisee) => {
      const contacts = contactsByFranchisee.get(franchisee.id) ?? [];
      const liveStats = participationByFranchisee.get(franchisee.id) ?? {
        invited: 0,
        attended: 0,
      };
      const latest = lastContactByFranchisee.get(franchisee.id);
      const daysWithoutContact = latest
        ? Math.max(0, Math.ceil((Date.now() - latest.getTime()) / 86_400_000))
        : null;
      const count = (type: string) =>
        contacts.filter((contact) => contact.type === type).length;
      return {
        id: franchisee.id,
        name: franchisee.name,
        unitName: franchisee.unitName,
        photoUrl: franchisee.photoUrl,
        moment: franchisee.moment,
        whatsapp: count("WHATSAPP"),
        telefone: count("TELEFONE"),
        video: count("VIDEO_CHAMADA"),
        presencial: count("PRESENCIAL"),
        live: count("LIVE"),
        livesInvited: liveStats.invited,
        livesAttended: liveStats.attended,
        liveAttendanceRate: liveStats.invited
          ? Math.round((liveStats.attended / liveStats.invited) * 100)
          : 0,
        lastContact: latest
          ? latest.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })
          : null,
        daysWithoutContact,
        attention: getContactAttention(daysWithoutContact),
      };
    }),
  });
}
