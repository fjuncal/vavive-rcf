"use client";

import { useState } from "react";
import { CalendarPlus, ClipboardList, Pencil } from "lucide-react";
import { MONTH_LABELS, formatMonthYear } from "@/lib/constants";

export type MonthlyServiceCountItem = {
  id: string;
  year: number;
  month: number;
  count: number;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1f5d8c] focus:bg-white";

function sortDesc(items: MonthlyServiceCountItem[]) {
  return [...items].sort((a, b) => b.year - a.year || b.month - a.month);
}

export function MonthlyServiceCountsPanel({
  franchiseeId,
  initialRecords,
  isSuperAdmin,
}: {
  franchiseeId: string;
  initialRecords: MonthlyServiceCountItem[];
  isSuperAdmin: boolean;
}) {
  const [records, setRecords] = useState(sortDesc(initialRecords));
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [count, setCount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCount, setEditingCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/franchisees/${franchiseeId}/monthly-service-counts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: Number(year),
            month: Number(month),
            count,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Não foi possível lançar o mês.");
      }
      setRecords((current) =>
        sortDesc([
          ...current,
          {
            id: payload.id,
            year: payload.year,
            month: payload.month,
            count: payload.count,
          },
        ]),
      );
      setCount("");
      setFeedback({
        type: "success",
        text: `${formatMonthYear(payload.month, payload.year)} lançado com ${payload.count} atendimentos.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível lançar o mês.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(record: MonthlyServiceCountItem) {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/franchisees/${franchiseeId}/monthly-service-counts/${record.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: editingCount }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Não foi possível salvar.");
      }
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id ? { ...item, count: payload.count } : item,
        ),
      );
      setEditingId(null);
      setFeedback({
        type: "success",
        text: `${formatMonthYear(record.month, record.year)} atualizado para ${payload.count}.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error ? error.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <ClipboardList className="h-5 w-5 text-[var(--brand-primary)]" />
        Atendimentos mensais
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {records.length} {records.length === 1 ? "mês" : "meses"}
        </span>
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Quantidades manuais por competência, do mês mais recente para o mais
        antigo.
      </p>

      <div className="mt-4 space-y-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">
                {formatMonthYear(record.month, record.year)}
              </p>
              {editingId === record.id ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    value={editingCount}
                    onChange={(event) => setEditingCount(event.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEdit(record)}
                    className="rounded-lg bg-[#1f5d8c] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <p className="mt-0.5 text-2xl font-semibold text-slate-900">
                  {record.count}
                </p>
              )}
            </div>
            {isSuperAdmin && editingId !== record.id ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(record.id);
                  setEditingCount(String(record.count));
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#1f5d8c]"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
            ) : null}
          </div>
        ))}
        {!records.length ? (
          <p className="text-sm text-slate-500">
            Nenhum atendimento mensal lançado para esta unidade.
          </p>
        ) : null}
      </div>

      {feedback ? (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}
        >
          {feedback.text}
        </p>
      ) : null}

      {isSuperAdmin ? (
        <form
          onSubmit={submit}
          className="mt-4 space-y-4 border-t border-slate-100 pt-5"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarPlus className="h-4 w-4" />
            Adicionar mês
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium text-slate-700">
              Mês
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className={`${inputClass} mt-2`}
              >
                {MONTH_LABELS.map((label, index) => (
                  <option key={index + 1} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Ano
              <input
                type="number"
                min={2000}
                max={2100}
                step={1}
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Quantidade
              <input
                type="number"
                min={0}
                max={1000000}
                step={1}
                value={count}
                onChange={(event) => setCount(event.target.value)}
                placeholder="Ex.: 35"
                required
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174a74] disabled:opacity-60"
          >
            <CalendarPlus className="h-4 w-4" />
            {saving ? "Lançando..." : "Lançar mês"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
