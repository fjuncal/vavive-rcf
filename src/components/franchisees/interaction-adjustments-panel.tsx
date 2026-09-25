"use client";

import { useState } from "react";
import { History, Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

// Mantido em sincronia com MAX_ADJUSTMENT_AMOUNT em
// src/services/interaction-adjustments.ts (validação final no backend).
const MAX_AMOUNT = 1000;

export type AdjustmentItem = {
  id: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  createdBy: { name: string };
};

export type InteractionTotalsState = {
  registeredInteractions: number;
  manualAdjustments: number;
  totalInteractions: number;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1f5d8c] focus:bg-white";

export function InteractionAdjustmentsPanel({
  franchiseeId,
  initialTotals,
  initialAdjustments,
  isSuperAdmin,
}: {
  franchiseeId: string;
  initialTotals: InteractionTotalsState;
  initialAdjustments: AdjustmentItem[];
  isSuperAdmin: boolean;
}) {
  const [totals, setTotals] = useState(initialTotals);
  const [adjustments, setAdjustments] =
    useState<AdjustmentItem[]>(initialAdjustments);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const parsedAmount = Number(amount);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/franchisees/${franchiseeId}/interaction-adjustments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: parsedAmount, notes }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.message || "Não foi possível adicionar as interações.",
        );
      }
      // Atualização imediata, sem F5: totais + histórico vêm da resposta.
      setTotals(payload.totals);
      setAdjustments((current) => [payload.adjustment, ...current]);
      setAmount("");
      setNotes("");
      setFeedback({
        type: "success",
        text: `+${payload.adjustment.amount} interações adicionadas com sucesso.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível adicionar as interações.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Interações</h3>

      <dl className="divide-y divide-slate-100">
        <div className="flex items-center justify-between py-3">
          <dt className="text-sm text-slate-500">Registradas</dt>
          <dd className="text-2xl font-semibold text-slate-900">
            {totals.registeredInteractions}
          </dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="text-sm text-slate-500">Ajustes manuais</dt>
          <dd className="text-2xl font-semibold text-[#0b8f45]">
            +{totals.manualAdjustments}
          </dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="text-sm font-semibold text-slate-900">Total</dt>
          <dd className="text-3xl font-semibold text-[var(--brand-secondary)]">
            {totals.totalInteractions}
          </dd>
        </div>
      </dl>

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
          <p className="text-sm font-semibold text-slate-700">
            Adicionar interações manualmente
          </p>
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <label className="block text-sm font-medium text-slate-700">
              Quantidade
              <input
                type="number"
                min={1}
                max={MAX_AMOUNT}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Ex.: 3"
                required
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Motivo / observação
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex.: contatos realizados antes da implantação do sistema"
                maxLength={500}
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1f5d8c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174a74] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {saving
              ? "Adicionando..."
              : Number.isInteger(parsedAmount) && parsedAmount > 0
                ? `Adicionar +${parsedAmount} interações`
                : "Adicionar interações"}
          </button>
        </form>
      ) : null}

      {isSuperAdmin ? (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <History className="h-4 w-4" />
            Histórico de ajustes
          </p>
          <div className="mt-3 space-y-3">
            {adjustments.length ? (
              adjustments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-lg font-semibold text-[#0b8f45]">
                      +{item.amount}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Adicionado por {item.createdBy.name}
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-slate-600">
                      “{item.notes}”
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Nenhum ajuste manual registrado para este franqueado.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
