import { Activity, Building2, PhoneCall, Users } from "lucide-react";
import type { ContactType } from "@prisma/client";
import Link from "next/link";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { FranchiseeCommunicationTable } from "@/components/dashboard/franchisee-communication-table";
import { prisma } from "@/lib/db";
import { measureServerOperation } from "@/lib/performance";
import {
  formatCivilDate,
  getImplementationDeadlineStatus,
  getTodayCivilDate,
  IMPLEMENTATION_DEADLINE_DAYS,
  IMPLEMENTATION_DEADLINE_STATUS_LABELS,
  nonNegativeCivilDayDifference,
  type ImplementationDeadlineStatus,
} from "@/lib/utils";
import { getManualAdjustmentsSummary } from "@/services/interaction-adjustments";

function parse(value?: string) {
  const date = value ? new Date(`${value}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const query = await searchParams;
  const now = new Date();
  const start =
    parse(query.start) || new Date(now.getFullYear(), now.getMonth(), 1);
  const endDay = parse(query.end) || now;
  const end = new Date(endDay);
  end.setHours(23, 59, 59, 999);
  const where = { contactedAt: { gte: start, lte: end } };

  const [
    channelCounts,
    franchiseeCounts,
    latestContacts,
    contactedFranchisees,
    trendContacts,
    active,
    implementationUnits,
    manualSummary,
  ] = await measureServerOperation("dashboard.queries", () =>
    Promise.all([
      prisma.contact.groupBy({ by: ["type"], where, _count: { _all: true } }),
      prisma.contact.groupBy({
        by: ["franchiseeId", "type"],
        where,
        _count: { _all: true },
      }),
      prisma.contact.groupBy({
        by: ["franchiseeId"],
        where,
        _max: { contactedAt: true },
      }),
      prisma.franchisee.findMany({
        where: { contacts: { some: where } },
        select: { id: true, name: true, unitName: true },
      }),
      prisma.contact.findMany({ where, select: { contactedAt: true } }),
      prisma.franchisee.count({ where: { active: true } }),
      prisma.franchisee.findMany({
        where: { active: true, moment: "IMPLANTACAO" },
        orderBy: [{ joinedNetworkAt: "asc" }, { unitName: "asc" }],
        select: {
          id: true,
          name: true,
          unitName: true,
          joinedNetworkAt: true,
        },
      }),
      // Manuais tipados (1 groupBy global, sem N+1): participam das mesmas
      // estatísticas onde o tipo já participa (qualified preservado).
      getManualAdjustmentsSummary(),
    ]),
  );

  const rowsByFranchisee = new Map(
    contactedFranchisees.map((franchisee) => [
      franchisee.id,
      {
        ...franchisee,
        whatsapp: 0,
        telefone: 0,
        video: 0,
        presencial: 0,
        live: 0,
        total: 0,
        last: new Date(0),
      },
    ]),
  );
  for (const group of franchiseeCounts) {
    const row = rowsByFranchisee.get(group.franchiseeId);
    if (!row) continue;
    const count = group._count._all;
    if (group.type === "WHATSAPP") row.whatsapp += count;
    if (group.type === "TELEFONE") row.telefone += count;
    if (group.type === "VIDEO_CHAMADA") row.video += count;
    if (group.type === "PRESENCIAL") row.presencial += count;
    if (group.type === "LIVE") row.live += count;
    row.total += count;
  }
  // Canais EFETIVOS por unidade: + manuais do mesmo tipo. Unidades sem
  // contato no período não ganham linha (membership = contatos reais).
  for (const [franchiseeId, perType] of manualSummary.byUnit) {
    const row = rowsByFranchisee.get(franchiseeId);
    if (!row) continue;
    const manual = (type: "WHATSAPP" | "TELEFONE" | "VIDEO_CHAMADA" | "PRESENCIAL" | "LIVE") =>
      perType.get(type) ?? 0;
    row.whatsapp += manual("WHATSAPP");
    row.telefone += manual("TELEFONE");
    row.video += manual("VIDEO_CHAMADA");
    row.presencial += manual("PRESENCIAL");
    row.live += manual("LIVE");
    row.total +=
      manual("WHATSAPP") +
      manual("TELEFONE") +
      manual("VIDEO_CHAMADA") +
      manual("PRESENCIAL") +
      manual("LIVE");
  }
  for (const latest of latestContacts) {
    const row = rowsByFranchisee.get(latest.franchiseeId);
    if (row && latest._max.contactedAt) row.last = latest._max.contactedAt;
  }
  const rows = [...rowsByFranchisee.values()]
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ ...row, last: row.last.toLocaleDateString("pt-BR") }));

  const channelCount = new Map(
    channelCounts.map((group) => [group.type, group._count._all]),
  );
  // Canais EFETIVOS globais: + manuais do mesmo tipo (legados sem canal
  // não entram em canal algum). Regra de qualificados preservada abaixo.
  for (const [type, value] of manualSummary.byType) {
    channelCount.set(type, (channelCount.get(type) ?? 0) + value);
  }
  const manualByTypeEntries = [...manualSummary.byType];
  const manualTotalAll = manualByTypeEntries.reduce(
    (total, [, value]) => total + value,
    0,
  );
  // Qualificados EFETIVOS: regra preservada (tudo exceto WHATSAPP),
  // somando manuais dos mesmos tipos. WHATSAPP segue excluído.
  const manualQualified = manualByTypeEntries
    .filter(([type]) => type !== "WHATSAPP")
    .reduce((total, [, value]) => total + value, 0);
  const contactsCount =
    channelCounts.reduce(
      (total, group) => total + group._count._all,
      0,
    ) + manualTotalAll;
  const qualified =
    channelCounts
      .filter((group) => group.type !== "WHATSAPP")
      .reduce((total, group) => total + group._count._all, 0) +
    manualQualified;
  const channels = [
    ["WhatsApp", "WHATSAPP"],
    ["Telefone", "TELEFONE"],
    ["Vídeo", "VIDEO_CHAMADA"],
    ["Presencial", "PRESENCIAL"],
    ["Live", "LIVE"],
  ].map(([name, type]) => ({
    name,
    value: channelCount.get(type as ContactType) ?? 0,
  }));

  const contactDays = new Map<string, number>();
  for (const contact of trendContacts) {
    const day = contact.contactedAt.toLocaleDateString("sv-SE", {
      timeZone: "America/Sao_Paulo",
    });
    contactDays.set(day, (contactDays.get(day) ?? 0) + 1);
  }
  const days = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
  const trend = Array.from({ length: days }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    const key = day.toLocaleDateString("sv-SE", {
      timeZone: "America/Sao_Paulo",
    });
    return {
      name: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(day),
      value: contactDays.get(key) ?? 0,
    };
  });
  const cards = [
    { label: "Franqueados ativos", value: active, icon: Building2 },
    { label: "Contatos no período", value: contactsCount, icon: Activity },
    { label: "Contatos qualificados", value: qualified, icon: PhoneCall },
    { label: "Franqueados contatados", value: rows.length, icon: Users },
  ];
  const todayCivilDate = getTodayCivilDate();
  const statusOrder: Record<ImplementationDeadlineStatus, number> = {
    overdue: 0,
    within_deadline: 1,
    unknown: 2,
  };
  const implantationRows = implementationUnits
    .map((unit) => {
      const days = nonNegativeCivilDayDifference(
        unit.joinedNetworkAt,
        todayCivilDate,
      );
      return {
        ...unit,
        days,
        deadlineStatus: getImplementationDeadlineStatus(days),
      };
    })
    .sort((a, b) => {
      const statusDifference =
        statusOrder[a.deadlineStatus] - statusOrder[b.deadlineStatus];
      if (statusDifference) return statusDifference;
      if (a.deadlineStatus === "overdue" && b.deadlineStatus === "overdue")
        return (b.days ?? -1) - (a.days ?? -1);
      return 0;
    });
  const implementationSummary = implantationRows.reduce(
    (summary, unit) => {
      if (unit.deadlineStatus === "within_deadline") summary.within++;
      if (unit.deadlineStatus === "overdue") summary.overdue++;
      if (unit.deadlineStatus === "unknown") summary.unknown++;
      return summary;
    },
    { within: 0, overdue: 0, unknown: 0 },
  );
  const deadlineStatusClass: Record<ImplementationDeadlineStatus, string> = {
    within_deadline: "border-emerald-200 bg-emerald-50 text-emerald-700",
    overdue: "border-rose-200 bg-rose-50 text-rose-700",
    unknown: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--brand-primary)]">
          Visão histórica
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-[var(--brand-secondary)]">
          Indicadores da rede
        </h1>
        <p className="mt-2 text-slate-500">
          De {start.toLocaleDateString("pt-BR")} até{" "}
          {endDay.toLocaleDateString("pt-BR")}.
        </p>
      </div>
      <PeriodFilter start={iso(start)} end={iso(endDay)} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="rounded-xl bg-[#eef7ef] p-3 text-[var(--brand-primary)]">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-6 text-4xl font-semibold text-[var(--brand-secondary)]">
              {value}
            </p>
          </div>
        ))}
      </div>
      {implantationRows.length ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-secondary)]">
                Implantações em andamento
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Dias corridos desde a entrada na rede. Prazo para inauguração:{" "}
                {IMPLEMENTATION_DEADLINE_DAYS} dias.
              </p>
            </div>
            <span className="rounded-full bg-[#eef7ef] px-3 py-1 text-sm font-semibold text-[#0b8f45]">
              {implantationRows.length} {implantationRows.length === 1 ? "unidade" : "unidades"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Em implantação", implantationRows.length, "bg-[#eef7ef] text-[#0b8f45]"],
              ["Dentro do prazo", implementationSummary.within, "bg-emerald-50 text-emerald-700"],
              ["Fora do prazo", implementationSummary.overdue, "bg-rose-50 text-rose-700"],
              ["Sem data / inválida", implementationSummary.unknown, "bg-slate-50 text-slate-600"],
            ].map(([label, value, className]) => (
              <div key={String(label)} className={`rounded-xl border border-slate-100 px-3 py-2 ${className}`}>
                <p className="text-xs font-medium">{label}</p>
                <p className="mt-1 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {implantationRows.map((unit) => (
              <Link
                key={unit.id}
                href={`/franqueados/${unit.id}/editar`}
                className="block cursor-pointer rounded-xl border border-slate-100 bg-[#f8fbf8] p-4 transition hover:border-[#b8d8c0] hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b8f45] focus-visible:ring-offset-2"
              >
                <p className="truncate font-semibold text-[var(--brand-secondary)]">
                  {unit.unitName}
                </p>
                <p className="mt-1 truncate text-sm text-slate-500">{unit.name}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-lg font-semibold text-[var(--brand-secondary)]">
                    {unit.days === null
                      ? unit.joinedNetworkAt
                        ? "Data inválida"
                        : "Entrada não informada"
                      : `${unit.days} ${unit.days === 1 ? "dia" : "dias"}`}
                  </p>
                  {unit.joinedNetworkAt ? (
                    <p className="text-right text-xs text-slate-500">
                      Entrada
                      <br />
                      {formatCivilDate(unit.joinedNetworkAt)}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${deadlineStatusClass[unit.deadlineStatus]}`}
                >
                  {IMPLEMENTATION_DEADLINE_STATUS_LABELS[unit.deadlineStatus]}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Canais de comunicação</h2>
          <p className="mt-1 text-sm text-slate-500">
            Distribuição no período selecionado.
          </p>
          <MonthlyChart data={channels} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Evolução de contatos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Volume diário no período selecionado.
          </p>
          <WeeklyChart data={trend} />
        </section>
      </div>
      <FranchiseeCommunicationTable rows={rows} />
    </div>
  );
}
