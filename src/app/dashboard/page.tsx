import { Activity, Building2, PhoneCall, Users } from "lucide-react";
import type { ContactType } from "@prisma/client";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { FranchiseeCommunicationTable } from "@/components/dashboard/franchisee-communication-table";
import { prisma } from "@/lib/db";
import { measureServerOperation } from "@/lib/performance";

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
  const contactsCount = channelCounts.reduce(
    (total, group) => total + group._count._all,
    0,
  );
  const qualified = channelCounts
    .filter((group) => group.type !== "WHATSAPP")
    .reduce((total, group) => total + group._count._all, 0);
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
