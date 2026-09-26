"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Minus, Pencil, Plus, Search, X } from "lucide-react";
import { MONTH_LABELS, formatMonthYear } from "@/lib/constants";
import type { MonthlyOverviewRow } from "@/services/monthly-service-counts";

type Overview = {
  year: number;
  month: number;
  previousYear: number;
  previousMonth: number;
  rows: MonthlyOverviewRow[];
};

type SortKey = "name" | "count" | "variation";
type DialogState =
  | { mode: "create"; row: MonthlyOverviewRow }
  | { mode: "edit"; row: MonthlyOverviewRow; recordId: string }
  | null;

function variationOf(row: MonthlyOverviewRow): number | null {
  if (row.current == null || row.previous == null) return null;
  if (row.previous.count <= 0) return null;
  return ((row.current.count - row.previous.count) / row.previous.count) * 100;
}

function formatVariation(value: number | null) {
  if (value == null) return null;
  const text = `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <ArrowUp className="h-3.5 w-3.5" />
        {text}
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
        <ArrowDown className="h-3.5 w-3.5" />
        {text}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
      <Minus className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

const thSortClass =
  "inline-flex items-center gap-1 hover:text-slate-800";

// Seletor de competência (visual apenas): selects nativos estilizados com
// chevron discreto. Valores continuam numéricos (month 1-12, year).
const competenceSelectClass =
  "w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-normal text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#1f5d8c] focus:ring-2 focus:ring-[#1f5d8c]/20";

// Faixa de anos dinâmica em torno do ano atual (sem hardcode). O ano
// selecionado é sempre incluído para o select nunca ficar em branco,
// mesmo vindo de querystring antiga.
const COMPETENCE_YEAR_PAST = 5;
const COMPETENCE_YEAR_FUTURE = 2;

function competenceYears(selectedYear: number) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (
    let year = currentYear - COMPETENCE_YEAR_PAST;
    year <= currentYear + COMPETENCE_YEAR_FUTURE;
    year += 1
  ) {
    years.push(year);
  }
  if (!years.includes(selectedYear)) {
    years.push(selectedYear);
    years.sort((a, b) => a - b);
  }
  return years;
}

export function MonthlyOverview({
  initial,
  isSuperAdmin,
}: {
  initial: Overview;
  isSuperAdmin: boolean;
}) {
  const [competence, setCompetence] = useState({
    year: initial.year,
    month: initial.month,
  });
  const [previous, setPrevious] = useState({
    year: initial.previousYear,
    month: initial.previousMonth,
  });
  const [rows, setRows] = useState(initial.rows);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogCount, setDialogCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  async function loadCompetence(year: number, month: number) {
    setCompetence({ year, month });
    setLoading(true);
    try {
      const response = await fetch(
        `/api/monthly-service-counts?year=${year}&month=${month}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Não foi possível carregar.");
      setRows(payload.rows);
      setPrevious({ year: payload.previousYear, month: payload.previousMonth });
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const list = term
      ? rows.filter((row) =>
          `${row.unitName} ${row.name} ${row.memberNames.join(" ")}`
            .toLocaleLowerCase("pt-BR")
            .includes(term),
        )
      : [...rows];
    const dir = sortDir;
    list.sort((a, b) => {
      if (sortKey === "count") {
        const av = a.current?.count;
        const bv = b.current?.count;
        if (av == null && bv == null) return a.unitName.localeCompare(b.unitName, "pt-BR");
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av - bv) * dir || a.unitName.localeCompare(b.unitName, "pt-BR");
      }
      if (sortKey === "variation") {
        const av = variationOf(a);
        const bv = variationOf(b);
        if (av == null && bv == null) return a.unitName.localeCompare(b.unitName, "pt-BR");
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av - bv) * dir || a.unitName.localeCompare(b.unitName, "pt-BR");
      }
      return a.unitName.localeCompare(b.unitName, "pt-BR") * dir;
    });
    return list;
  }, [rows, search, sortKey, sortDir]);

  const launched = rows.filter((row) => row.current != null);
  const total = launched.reduce((sum, row) => sum + (row.current?.count ?? 0), 0);
  const missing = rows.length - launched.length;
  const average = launched.length ? total / launched.length : 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? 1 : -1);
    }
  }

  function openDialog(state: DialogState) {
    setDialog(state);
    setDialogCount(
      state?.mode === "edit" ? String(state.row.current?.count ?? "") : "",
    );
    setDialogError("");
  }

  async function saveDialog(event: React.FormEvent) {
    event.preventDefault();
    if (!dialog) return;
    setSaving(true);
    setDialogError("");
    try {
      const url =
        dialog.mode === "create"
          ? `/api/franchisees/${dialog.row.id}/monthly-service-counts`
          : `/api/franchisees/${dialog.row.id}/monthly-service-counts/${dialog.recordId}`;
      const body =
        dialog.mode === "create"
          ? { year: competence.year, month: competence.month, count: dialogCount }
          : { count: dialogCount };
      const response = await fetch(url, {
        method: dialog.mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Não foi possível salvar.");
      setRows((current) =>
        current.map((row) =>
          row.id === dialog.row.id
            ? { ...row, current: { id: payload.id, count: payload.count } }
            : row,
        ),
      );
      setDialog(null);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--brand-primary)]">
            Números manuais
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--brand-secondary)]">
            Atendimentos
          </h1>
          <p className="mt-2 text-sm text-slate-500">Visão mensal das unidades</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
            Competência
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block text-sm font-semibold text-slate-700">
              Mês
              <span className="relative mt-2 block">
                <select
                  value={competence.month}
                  onChange={(event) => loadCompetence(competence.year, Number(event.target.value))}
                  className={`${competenceSelectClass} min-w-40`}
                  aria-label="Mês de referência"
                >
                  {MONTH_LABELS.map((label, index) => (
                    <option key={index + 1} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </span>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Ano
              <span className="relative mt-2 block">
                <select
                  value={competence.year}
                  onChange={(event) => loadCompetence(Number(event.target.value), competence.month)}
                  className={`${competenceSelectClass} w-full min-[420px]:w-28`}
                  aria-label="Ano de referência"
                >
                  {competenceYears(competence.year).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total de atendimentos</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {total.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">{formatMonthYear(competence.month, competence.year)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Franquias com lançamento</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {launched.length} <span className="text-lg font-normal text-slate-400">de {rows.length}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">unidades com número informado</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Média por franquia</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {launched.length
              ? average.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
              : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">somente quem lançou</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Faltam lançar</p>
          <p className={`mt-3 text-3xl font-semibold ${missing ? "text-amber-600" : "text-emerald-600"}`}>
            {missing}
          </p>
          <p className="mt-1 text-xs text-slate-500">unidades sem registro no mês</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500 focus-within:border-[#1f5d8c] focus-within:bg-white">
          <Search className="h-4 w-4" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar franquia ou unidade"
            className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("name")} className={thSortClass}>
                    Franquia / Unidade {sortKey === "name" ? (sortDir === 1 ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("count")} className={thSortClass}>
                    Atendimentos {sortKey === "count" ? (sortDir === 1 ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th className="px-4 py-3">Mês anterior</th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => toggleSort("variation")} className={thSortClass}>
                    Variação {sortKey === "variation" ? (sortDir === 1 ? "▲" : "▼") : ""}
                  </button>
                </th>
                {isSuperAdmin ? <th className="px-4 py-3 text-right">Ação</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {filtered.map((row) => {
                const variation = variationOf(row);
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.unitName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[row.name, ...row.memberNames.filter((name) => name !== row.name)]
                          .filter(Boolean)
                          .join(" • ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {row.current != null ? (
                        <span className="text-lg font-semibold text-slate-900">
                          {row.current.count.toLocaleString("pt-BR")}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.previous != null ? (
                        <span className="font-medium text-slate-600">
                          {row.previous.count.toLocaleString("pt-BR")}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                      <span className="block text-xs text-slate-400">
                        {formatMonthYear(previous.month, previous.year)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatVariation(variation) ?? <span className="text-slate-300">—</span>}</td>
                    {isSuperAdmin ? (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          {row.current != null ? (
                            <button
                              type="button"
                              onClick={() => openDialog({ mode: "edit", row, recordId: row.current?.id ?? "" })}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#1f5d8c] hover:text-[#1f5d8c]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openDialog({ mode: "create", row })}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#1f5d8c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#174a74]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Lançar
                            </button>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-12 text-center text-slate-500">
                    {loading ? "Carregando..." : "Nenhuma franquia encontrada para esta busca."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {dialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#003b71]/50 p-5 backdrop-blur-sm">
          <form
            onSubmit={saveDialog}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-br from-[#003b71] to-[#145987] px-7 py-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b8ee35]">
                {dialog.mode === "create" ? "Lançar atendimentos" : "Editar atendimentos"}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{dialog.row.unitName}</h2>
              <p className="mt-1 text-sm text-white/70">
                Competência: {formatMonthYear(competence.month, competence.year)}
              </p>
            </div>
            <div className="space-y-5 p-7">
              <label className="block text-sm font-semibold text-slate-700">
                Quantidade
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  step={1}
                  value={dialogCount}
                  onChange={(event) => setDialogCount(event.target.value)}
                  placeholder="Ex.: 35"
                  required
                  autoFocus
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1f5d8c]"
                />
              </label>
              {dialogError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {dialogError}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#1f5d8c] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#174a74] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
