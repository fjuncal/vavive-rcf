import { NextRequest, NextResponse } from "next/server";
import type { ContactType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/services/auth";
import { QUALIFIED_CONTACT_TYPES } from "@/lib/constants";
import {
  getContactAttention,
  getDaysWithoutContact,
} from "@/lib/contact-attention";
import {
  getManualAdjustmentsByType,
  getManualAdjustmentsTotals,
} from "@/services/interaction-adjustments";

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
      createdAt: true,
    },
  });
  const ids = franchisees.map((item) => item.id);
  const [
    periodContactGroups,
    latestContacts,
    participations,
    lifetimeContactGroups,
    manualTotals,
    manualByType,
    memberRows,
  ] = await Promise.all([
      prisma.contact.groupBy({
        by: ["franchiseeId", "type"],
        where: {
          franchiseeId: { in: ids },
          contactedAt: range,
        },
        _count: { _all: true },
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
      // Total de interações no tempo (sem filtro de período): base para
      // registeredInteractions. Ajustes manuais entram nas contagens por
      // canal/qualificados do mesmo tipo, mas NUNCA em último contato,
      // dias sem contato ou atenção.
      prisma.contact.groupBy({
        by: ["franchiseeId"],
        where: { franchiseeId: { in: ids } },
        _count: { _all: true },
      }),
      getManualAdjustmentsTotals(ids),
      // Manuais por canal (1 groupBy em lote, sem N+1 e sem históricos).
      getManualAdjustmentsByType(ids),
      // Pessoas da unidade (1 query para todas, sem N+1 e sem históricos).
      prisma.franchiseeMember.findMany({
        where: { franchiseeId: { in: ids }, active: true },
        select: { id: true, franchiseeId: true, name: true, photoUrl: true },
        orderBy: [{ franchiseeId: "asc" }, { createdAt: "asc" }],
      }),
    ]);

  const contactsByFranchisee = new Map<string, Map<string, number>>();
  for (const group of periodContactGroups) {
    const counts = contactsByFranchisee.get(group.franchiseeId) ?? new Map();
    counts.set(group.type, group._count._all);
    contactsByFranchisee.set(group.franchiseeId, counts);
  }

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
  const membersByFranchisee = new Map<string, Array<{ id: string; name: string; photoUrl: string | null }>>();
  for (const member of memberRows) {
    const list = membersByFranchisee.get(member.franchiseeId) ?? [];
    list.push({ id: member.id, name: member.name, photoUrl: member.photoUrl });
    membersByFranchisee.set(member.franchiseeId, list);
  }
  const lifetimeByFranchisee = new Map(
    lifetimeContactGroups.map((item) => [
      item.franchiseeId,
      item._count._all,
    ]),
  );
  // Manuais agregados por tipo (todas as unidades): participam das mesmas
  // estatísticas onde o ContactType já participa (qualified preservado).
  const manualByTypeTotal = new Map<string, number>();
  for (const perUnit of manualByType.values()) {
    for (const [type, value] of perUnit) {
      manualByTypeTotal.set(type, (manualByTypeTotal.get(type) ?? 0) + value);
    }
  }
  const manualOf = (type: string) => manualByTypeTotal.get(type) ?? 0;
  const qualified =
    periodContactGroups
      .filter((group) => QUALIFIED_CONTACT_TYPES.includes(group.type))
      .reduce((total, group) => total + group._count._all, 0) +
    QUALIFIED_CONTACT_TYPES.reduce((total, type) => total + manualOf(type), 0);
  const countType = (type: string) =>
    periodContactGroups
      .filter((group) => group.type === type)
      .reduce((total, group) => total + group._count._all, 0) +
    manualOf(type);
  const contactedFranchisees = new Set(
    periodContactGroups
      .filter((group) => QUALIFIED_CONTACT_TYPES.includes(group.type))
      .map((group) => group.franchiseeId),
  ).size;

  return NextResponse.json({
    period,
    periodLabel: periodLabels[period],
    currentMonth: {
      qualifiedContacts: qualified,
      contactedFranchisees,
      totalFranchisees: franchisees.length,
      byType: [
        { name: "Telefone", value: countType("TELEFONE") },
        { name: "Videochamada", value: countType("VIDEO_CHAMADA") },
        { name: "Presencial", value: countType("PRESENCIAL") },
        { name: "Live", value: countType("LIVE") },
      ],
      totalQualified: qualified,
    },
    franchisees: franchisees.map((franchisee) => {
      const counts = contactsByFranchisee.get(franchisee.id) ?? new Map();
      const liveStats = participationByFranchisee.get(franchisee.id) ?? {
        invited: 0,
        attended: 0,
      };
      const latest = lastContactByFranchisee.get(franchisee.id);
      // Atenção DA UNIDADE (nunca por pessoa): qualquer contato válido
      // recalcula; IMPLANTACAO sem contato usa createdAt como referência.
      const daysWithoutContact = getDaysWithoutContact({
        lastContactedAt: latest ?? null,
        unitCreatedAt: franchisee.createdAt,
        moment: franchisee.moment,
      });
      const count = (type: ContactType) =>
        (counts.get(type) ?? 0) +
        (manualByType.get(franchisee.id)?.get(type) ?? 0);
      // Total de interações (tempo total, sem filtro de período):
      // registros reais + ajustes manuais (inclui legados sem canal).
      const registeredInteractions = lifetimeByFranchisee.get(franchisee.id) ?? 0;
      const manualAdjustments = manualTotals.get(franchisee.id) ?? 0;
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
        registeredInteractions,
        manualAdjustments,
        totalInteractions: registeredInteractions + manualAdjustments,
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
        hasContact: latest != null,
        daysWithoutContact,
        attention: getContactAttention(daysWithoutContact, franchisee.moment),
        members: membersByFranchisee.get(franchisee.id) ?? [],
      };
    }),
  });
}
