"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Plus,
  RotateCcw,
  Search,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  LiveFormModal,
  type LiveFranchisee,
  type LiveHost,
} from "@/components/lives/live-form-modal";

export type LiveListItem = {
  id: string;
  title: string;
  scheduledAt: string;
  hostName: string;
  participantCount: number;
  notes: string | null;
  status: "scheduled" | "completed";
};

type Filters = {
  search?: string;
  period?: "current_month" | "previous_month" | "last_30_days" | "all";
  hostUserId?: string;
  status?: "scheduled" | "completed" | "all";
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatFullDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export function LivesList({
  lives,
  hosts,
  franchisees,
  filters,
  summary,
}: {
  lives: LiveListItem[];
  hosts: LiveHost[];
  franchisees: LiveFranchisee[];
  filters: Filters;
  summary: {
    count: number;
    participations: number;
    uniqueParticipants: number;
    next: { title: string; scheduledAt: string } | null;
  };
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState(filters.search ?? "");
  const suppressSearchNavigation = useRef(false);

  useEffect(() => {
    if (suppressSearchNavigation.current) {
      suppressSearchNavigation.current = false;
      return;
    }
    const normalizedSearch = search.trim();
    if (normalizedSearch === (filters.search ?? "")) return;

    const timeout = window.setTimeout(
      () => {
        const params = new URLSearchParams();
        if (normalizedSearch) params.set("search", normalizedSearch);
        if (filters.period && filters.period !== "all")
          params.set("period", filters.period);
        if (filters.hostUserId) params.set("hostUserId", filters.hostUserId);
        if (filters.status && filters.status !== "all")
          params.set("status", filters.status);
        router.replace(`/lives${params.size ? `?${params}` : ""}`);
      },
      normalizedSearch ? 350 : 0,
    );

    return () => window.clearTimeout(timeout);
  }, [
    filters.hostUserId,
    filters.period,
    filters.search,
    filters.status,
    router,
    search,
  ]);

  function update(next: Partial<Filters>) {
    const params = new URLSearchParams();
    const values = { ...filters, ...next };
    if (values.search) params.set("search", values.search);
    if (values.period && values.period !== "all")
      params.set("period", values.period);
    if (values.hostUserId) params.set("hostUserId", values.hostUserId);
    if (values.status && values.status !== "all")
      params.set("status", values.status);
    router.push(`/lives${params.size ? `?${params}` : ""}`);
  }

  function clearFilters() {
    suppressSearchNavigation.current = true;
    setSearch("");
    router.push("/lives");
  }

  const hasFilters = Boolean(
    filters.search ||
    (filters.period && filters.period !== "all") ||
    filters.hostUserId ||
    (filters.status && filters.status !== "all"),
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--brand-primary)]">
            Encontros da rede
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--brand-secondary)]">
            Lives da rede
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Gerencie treinamentos, encontros e lives realizadas com a rede de
            franqueados.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-primary)]/20"
        >
          <Plus className="h-4 w-4" />
          Nova Live
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Video className="h-5 w-5" />}
          label="Lives no período"
          value={summary.count}
          helper="Encontros registrados"
        />
        <SummaryCard
          icon={<Users className="h-5 w-5" />}
          label="Participações"
          value={summary.participations}
          helper="Presenças contabilizadas"
        />
        <SummaryCard
          icon={<UserRound className="h-5 w-5" />}
          label="Franqueados alcançados"
          value={summary.uniqueParticipants}
          helper="Pessoas únicas no período"
        />
        <SummaryCard
          icon={<CalendarRange className="h-5 w-5" />}
          label="Próxima Live"
          value={
            summary.next
              ? `${formatFullDate(summary.next.scheduledAt)} · ${formatTime(summary.next.scheduledAt)}`
              : "Sem agenda"
          }
          helper={summary.next?.title ?? "Nenhuma live agendada"}
          compact
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="border-b border-[var(--border)] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 transition focus-within:border-[var(--brand-primary)] focus-within:ring-4 focus-within:ring-[var(--brand-primary)]/10 xl:max-w-md">
              <Search className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título ou responsável"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-slate-400"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Limpar busca"
                  title="Limpar busca"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[var(--brand-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>

            <div className="grid gap-3 sm:grid-cols-3 xl:flex">
              <FilterSelect
                label="Período"
                value={filters.period ?? "all"}
                onChange={(value) =>
                  update({ period: value as Filters["period"] })
                }
              >
                <option value="all">Todo período</option>
                <option value="current_month">Este mês</option>
                <option value="previous_month">Mês anterior</option>
                <option value="last_30_days">Últimos 30 dias</option>
              </FilterSelect>
              <FilterSelect
                label="Responsável"
                value={filters.hostUserId ?? ""}
                onChange={(value) => update({ hostUserId: value || undefined })}
              >
                <option value="">Todos responsáveis</option>
                {hosts.map((host) => (
                  <option value={host.id} key={host.id}>
                    {host.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Status"
                value={filters.status ?? "all"}
                onChange={(value) =>
                  update({ status: value as Filters["status"] })
                }
              >
                <option value="all">Todos os status</option>
                <option value="scheduled">Agendadas</option>
                <option value="completed">Realizadas</option>
              </FilterSelect>
            </div>
          </div>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--brand-primary)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between bg-slate-50/70 px-5 py-4 lg:px-6">
          <div>
            <h2 className="text-base font-bold text-[var(--brand-secondary)]">
              Agenda de Lives
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Acompanhe encontros realizados e próximos eventos.
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
            {lives.length} resultado{lives.length === 1 ? "" : "s"}
          </span>
        </div>

        {lives.length ? (
          <div className="divide-y divide-[var(--border)]">
            {lives.map((live) => (
              <LiveRow live={live} key={live.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            hasFilters={hasFilters}
            onCreate={() => setCreating(true)}
            onClear={clearFilters}
          />
        )}
      </section>

      {creating ? (
        <LiveFormModal
          hosts={hosts}
          franchisees={franchisees}
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            router.push(`/lives/${id}`);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  helper: string;
  compact?: boolean;
}) {
  return (
    <article className="min-h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            {label}
          </p>
          <p
            className={`mt-3 truncate font-bold text-[var(--brand-secondary)] ${compact ? "text-base" : "text-3xl"}`}
          >
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--brand-primary)]">
          {icon}
        </span>
      </div>
      <p className="mt-2 truncate text-xs text-[var(--text-secondary)]">
        {helper}
      </p>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="min-w-40">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10"
      >
        {children}
      </select>
    </label>
  );
}

function LiveRow({ live }: { live: LiveListItem }) {
  const date = new Date(live.scheduledAt);
  const day = String(date.getDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();

  return (
    <Link
      href={`/lives/${live.id}`}
      className="group grid gap-4 px-5 py-5 transition hover:bg-[var(--background)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary)] lg:px-6 xl:grid-cols-[76px_minmax(240px,1fr)_minmax(160px,.55fr)_120px_120px_120px] xl:items-center"
    >
      <div className="flex h-[68px] w-[68px] shrink-0 flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-white text-center shadow-sm">
        <span className="text-xl font-bold leading-none text-[var(--brand-secondary)]">
          {day}
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
          {month}
        </span>
        <span className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
          {formatTime(live.scheduledAt)}
        </span>
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-[var(--brand-secondary)] transition group-hover:text-[var(--brand-primary)]">
          {live.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">
          {live.notes || "Sem observações registradas para esta live."}
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-xs font-bold text-[var(--brand-primary)]">
          {live.hostName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Responsável
          </span>
          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
            {live.hostName}
          </span>
        </div>
      </div>

      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <Users className="h-4 w-4 text-[var(--brand-primary)]" />
        {live.participantCount} participantes
      </span>

      <StatusBadge status={live.status} />

      <span className="inline-flex items-center justify-end gap-2 text-sm font-bold text-[var(--brand-primary)]">
        Ver detalhes
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function StatusBadge({ status }: { status: LiveListItem["status"] }) {
  const scheduled = status === "scheduled";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        scheduled
          ? "bg-blue-50 text-blue-700"
          : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {scheduled ? (
        <Clock3 className="h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {scheduled ? "Agendada" : "Realizada"}
    </span>
  );
}

function EmptyState({
  hasFilters,
  onCreate,
  onClear,
}: {
  hasFilters: boolean;
  onCreate: () => void;
  onClear: () => void;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--background)] text-[var(--brand-primary)]">
        <CalendarDays className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-bold text-[var(--brand-secondary)]">
        {hasFilters
          ? "Nenhum resultado para esta busca"
          : "Nenhuma live cadastrada"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
        {hasFilters
          ? "Revise os critérios selecionados ou limpe os filtros para visualizar todas as lives."
          : "Cadastre a primeira live para acompanhar os encontros e a participação da rede."}
      </p>
      <button
        type="button"
        onClick={hasFilters ? onClear : onCreate}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white"
      >
        {hasFilters ? (
          <RotateCcw className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {hasFilters ? "Limpar filtros" : "Cadastrar primeira Live"}
      </button>
    </div>
  );
}
