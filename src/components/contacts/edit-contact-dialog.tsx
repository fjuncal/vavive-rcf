"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { CONTACT_TYPE_LABELS } from "@/lib/constants";

type Channel = keyof typeof CONTACT_TYPE_LABELS;

export type EditableContact = {
  id: string;
  type: Channel;
  contactedAt: string;
  notes: string | null;
  memberId: string | null;
};

function splitLocal(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function joinLocal(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1f5d8c]";

export function EditContactDialog({
  contact,
  members,
  lockTypeAndDate = false,
}: {
  contact: EditableContact;
  members: Array<{ id: string; name: string }>;
  // Contato gerado por Live: backend bloqueia type/contactedAt; o dialog
  // reflete a regra (autoridade continua no PUT /api/contacts/[id]).
  lockTypeAndDate?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial = splitLocal(contact.contactedAt);
  const [type, setType] = useState<Channel>(contact.type);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [memberId, setMemberId] = useState(contact.memberId ?? "");
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    const current = splitLocal(contact.contactedAt);
    setType(contact.type);
    setDate(current.date);
    setTime(current.time);
    setMemberId(contact.memberId ?? "");
    setNotes(contact.notes ?? "");
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!date || !time) {
      setError("Informe data e hora do contato.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          contactedAt: joinLocal(date, time),
          memberId,
          notes,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Não foi possível salvar.");
      }
      // Sucesso: fecha e recarrega dados reais (métricas, canais,
      // lastContact e attention recalculados no servidor, sem F5).
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        title="Editar registro"
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#1f5d8c] hover:text-[#1f5d8c]"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#003b71]/50 p-5 backdrop-blur-sm">
          <form
            onSubmit={submit}
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between bg-gradient-to-br from-[#003b71] to-[#145987] px-7 py-6 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b8ee35]">
                  Correção de registro
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Editar contato
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                <X />
              </button>
            </div>
            <div className="space-y-5 p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Canal
                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as Channel)
                    }
                    disabled={lockTypeAndDate}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {(Object.keys(CONTACT_TYPE_LABELS) as Channel[]).map(
                      (option) => (
                        <option key={option} value={option}>
                          {CONTACT_TYPE_LABELS[option]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Pessoa
                  <select
                    value={memberId}
                    onChange={(event) => setMemberId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Sem pessoa específica</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Data
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                    disabled={lockTypeAndDate}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Hora
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    required
                    disabled={lockTypeAndDate}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  />
                </label>
              </div>
              {lockTypeAndDate ? (
                <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                  Contato gerado por Live: canal e data não podem ser
                  alterados. Pessoa e observação seguem editáveis.
                </p>
              ) : null}
              <label className="block text-sm font-semibold text-slate-700">
                Observação
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Descreva o contexto do contato"
                  className={inputClass}
                />
              </label>
              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#1f5d8c] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#174a74] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
