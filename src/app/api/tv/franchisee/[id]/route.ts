import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/services/auth";
import { QUALIFIED_CONTACT_TYPES } from "@/lib/constants";
import {
  getContactAttention,
  getDaysWithoutContact,
} from "@/lib/contact-attention";
import { getInteractionBreakdown } from "@/services/interaction-adjustments";

type TVPeriod =
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "current_month"
  | "previous_month";

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

function parsePeriod(value: string | null): TVPeriod {
  return value === "last_7_days" ||
    value === "last_90_days" ||
    value === "current_month" ||
    value === "previous_month" ||
    value === "last_30_days"
    ? value
    : "last_30_days";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { message: "Sessão expirada. Entre novamente." },
      { status: 401 },
    );
  const { id } = await params;
  const period = parsePeriod(request.nextUrl.searchParams.get("period"));
  const range = periodRange(period);
  const [franchisee, contactGroups, latest, participations, totals, members] =
    await Promise.all([
      prisma.franchisee.findFirst({
        where: { id, active: true },
        select: {
          id: true,
          name: true,
          unitName: true,
          photoUrl: true,
          moment: true,
          createdAt: true,
        },
      }),
      prisma.contact.groupBy({
        by: ["type"],
        where: { franchiseeId: id, contactedAt: range },
        _count: { _all: true },
      }),
      prisma.contact.findFirst({
        where: { franchiseeId: id },
        orderBy: [{ contactedAt: "desc" }, { createdAt: "desc" }],
        select: { contactedAt: true },
      }),
      prisma.liveParticipant.findMany({
        where: { franchiseeId: id, live: { scheduledAt: range } },
        select: { attended: true },
      }),
      // Total de interações (tempo total): registros + ajustes manuais.
      // Manuais entram por canal/qualificados do mesmo tipo;
      // NUNCA em último contato, dias sem contato ou atenção.
      getInteractionBreakdown(id),
      prisma.franchiseeMember.findMany({
        where: { franchiseeId: id, active: true },
        select: { id: true, name: true, photoUrl: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
  if (!franchisee)
    return NextResponse.json(
      { message: "Franqueado não encontrado." },
      { status: 404 },
    );

  const counts = new Map(
    contactGroups.map((group) => [group.type, group._count._all]),
  );
  // Contagens por canal EFETIVAS: registradas no período + manuais do tipo.
  const effective = (type: keyof typeof totals.byType) =>
    (counts.get(type) ?? 0) + totals.byType[type].manual;
  const daysWithoutContact = getDaysWithoutContact({
    lastContactedAt: latest?.contactedAt ?? null,
    unitCreatedAt: franchisee.createdAt,
    moment: franchisee.moment,
  });
  const livesInvited = participations.length;
  const livesAttended = participations.filter((item) => item.attended).length;
  return NextResponse.json({
    ...franchisee,
    whatsapp: effective("WHATSAPP"),
    telefone: effective("TELEFONE"),
    video: effective("VIDEO_CHAMADA"),
    presencial: effective("PRESENCIAL"),
    live: effective("LIVE"),
    registeredInteractions: totals.registeredInteractions,
    manualAdjustments: totals.manualAdjustments,
    totalInteractions: totals.totalInteractions,
    members,
    livesInvited,
    livesAttended,
    liveAttendanceRate: livesInvited
      ? Math.round((livesAttended / livesInvited) * 100)
      : 0,
    lastContact: latest
      ? latest.contactedAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        })
      : null,
    hasContact: latest != null,
    daysWithoutContact,
    attention: getContactAttention(daysWithoutContact, franchisee.moment),
    qualifiedContacts:
      contactGroups
        .filter((group) => QUALIFIED_CONTACT_TYPES.includes(group.type))
        .reduce((total, group) => total + group._count._all, 0) +
      QUALIFIED_CONTACT_TYPES.reduce(
        (total, type) => total + totals.byType[type].manual,
        0,
      ),
  });
}
