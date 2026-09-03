import { Activity, Building2, PhoneCall, Users } from "lucide-react";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { FranchiseeCommunicationTable } from "@/components/dashboard/franchisee-communication-table";
import { prisma } from "@/lib/db";

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
  const [contacts, active] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { contactedAt: "desc" },
      select: {
        type: true,
        contactedAt: true,
        franchisee: { select: { id: true, name: true, unitName: true } },
      },
    }),
    prisma.franchisee.count({ where: { active: true } }),
  ]);
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      unitName: string;
      whatsapp: number;
      telefone: number;
      video: number;
      presencial: number;
      live: number;
      total: number;
      last: Date;
    }
  >();
  for (const contact of contacts) {
    const item = map.get(contact.franchisee.id) || {
      ...contact.franchisee,
      whatsapp: 0,
      telefone: 0,
      video: 0,
      presencial: 0,
      live: 0,
      total: 0,
      last: contact.contactedAt,
    };
    if (contact.type === "WHATSAPP") item.whatsapp++;
    if (contact.type === "TELEFONE") item.telefone++;
    if (contact.type === "VIDEO_CHAMADA") item.video++;
    if (contact.type === "PRESENCIAL") item.presencial++;
    if (contact.type === "LIVE") item.live++;
    item.total++;
    if (contact.contactedAt > item.last) item.last = contact.contactedAt;
    map.set(contact.franchisee.id, item);
  }
  const rows = [...map.values()]
    .sort((a, b) => b.total - a.total)
    .map((item) => ({ ...item, last: item.last.toLocaleDateString("pt-BR") }));
  const count = (type: string) =>
    contacts.filter((contact) => contact.type === type).length;
  const qualified = contacts.filter(
    (contact) => contact.type !== "WHATSAPP",
  ).length;
  const channels = [
    ["WhatsApp", "WHATSAPP"],
    ["Telefone", "TELEFONE"],
    ["Vídeo", "VIDEO_CHAMADA"],
    ["Presencial", "PRESENCIAL"],
    ["Live", "LIVE"],
  ].map(([name, type]) => ({ name, value: count(type) }));
  const days = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
  const trend = Array.from({ length: days }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    return {
      name: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(day),
      value: contacts.filter(
        (contact) => contact.contactedAt.toDateString() === day.toDateString(),
      ).length,
    };
  });
  const cards = [
    { label: "Franqueados ativos", value: active, icon: Building2 },
    { label: "Contatos no período", value: contacts.length, icon: Activity },
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
