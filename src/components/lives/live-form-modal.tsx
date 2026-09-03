"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  LoaderCircle,
  Search,
  Users,
  X,
} from "lucide-react";

export type LiveHost = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export type LiveFranchisee = {
  id: string;
  name: string;
  unitName: string;
  photoUrl?: string | null;
  moment?: "IMPLANTACAO" | "INAUGURADA";
};

export type LiveFormValue = {
  id?: string;
  title: string;
  scheduledAt: string;
  hostUserId: string;
  participantIds: string[];
  notes: string;
};

function toDateTimeParts(value?: string) {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return {
    date: date.toISOString().slice(0, 10),
    time: date.toISOString().slice(11, 16),
  };
}

export function LiveFormModal({
  initial,
  hosts,
  franchisees,
  onClose,
  onSaved,
}: {
  initial?: LiveFormValue;
  hosts: LiveHost[];
  franchisees: LiveFranchisee[];
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const initialParts = toDateTimeParts(initial?.scheduledAt);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initialParts.date);
  const [time, setTime] = useState(initialParts.time);
  const [hostUserId, setHostUserId] = useState(
    initial?.hostUserId ?? hosts[0]?.id ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [selected, setSelected] = useState(
    () => new Set(initial?.participantIds ?? []),
  );
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visible = useMemo(
    () =>
      franchisees.filter((item) =>
        `${item.name} ${item.unitName}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [franchisees, query],
  );

  const input =
    "mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10";

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(
      (current) => new Set([...current, ...visible.map((item) => item.id)]),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        initial?.id ? `/api/lives/${initial.id}` : "/api/lives",
        {
          method: initial?.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
            hostUserId,
            participantIds: [...selected],
            notes,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message || "Não foi possível salvar a Live.");
      onSaved(data.id ?? initial?.id ?? "");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar a Live.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
      <form
        onSubmit={submit}
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-2.5rem)]"
      >
        <header className="flex items-start justify-between border-b border-[var(--border)] px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--brand-primary)]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[var(--brand-secondary)]">
                {initial?.id ? "Editar Live" : "Nova Live"}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Informe os dados do encontro e selecione os participantes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[.82fr_1.18fr] lg:overflow-hidden">
          <div className="space-y-7 border-b border-[var(--border)] p-5 sm:p-7 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <section>
              <SectionTitle
                number="01"
                title="Informações da Live"
                description="Dados principais do encontro."
              />
              <div className="mt-5 space-y-5">
                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                  Título *
                  <input
                    className={input}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex.: Treinamento Comercial"
                    required
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-[var(--text-primary)]">
                    Data *
                    <input
                      className={input}
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm font-semibold text-[var(--text-primary)]">
                    Horário *
                    <input
                      className={input}
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                  Responsável *
                  <select
                    className={input}
                    value={hostUserId}
                    onChange={(event) => setHostUserId(event.target.value)}
                    required
                  >
                    {hosts.map((host) => (
                      <option key={host.id} value={host.id}>
                        {host.name} — {host.email}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionTitle
                number="03"
                title="Observações"
                description="Contexto ou informações adicionais."
              />
              <label className="mt-5 block text-sm font-semibold text-[var(--text-primary)]">
                Observação
                <textarea
                  className={`${input} min-h-32 resize-y`}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Informações adicionais (opcional)"
                />
              </label>
            </section>
          </div>

          <section className="flex min-h-[520px] flex-col bg-slate-50/55 lg:min-h-0">
            <div className="border-b border-[var(--border)] bg-white px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <SectionTitle
                  number="02"
                  title="Participantes"
                  description="Selecione os franqueados que participaram."
                />
                <span className="shrink-0 rounded-full bg-[var(--background)] px-3 py-1.5 text-xs font-bold text-[var(--brand-primary)]">
                  {selected.size} selecionado{selected.size === 1 ? "" : "s"}
                </span>
              </div>
              <label className="mt-5 flex h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 transition focus-within:border-[var(--brand-primary)] focus-within:ring-4 focus-within:ring-[var(--brand-primary)]/10">
                <Search className="h-4 w-4 text-[var(--brand-primary)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar franqueado ou unidade"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-bold text-[var(--brand-primary)] hover:underline"
                >
                  Selecionar resultados ({visible.length})
                </button>
                <span className="h-3 w-px bg-[var(--border)]" />
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="space-y-2">
                {visible.map((item) => {
                  const checked = selected.has(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={checked}
                      onClick={() => toggle(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
                        checked
                          ? "border-[var(--brand-primary)] bg-white shadow-sm"
                          : "border-transparent bg-white/70 hover:border-[var(--border)] hover:bg-white"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          checked
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {checked ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--background)] text-xs font-bold text-[var(--brand-primary)]">
                        {item.photoUrl ? (
                          <Image
                            src={item.photoUrl}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          item.name.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm text-[var(--brand-secondary)]">
                          {item.name}
                        </b>
                        <small className="mt-0.5 block truncate text-[var(--text-secondary)]">
                          {item.unitName}
                        </small>
                      </span>
                      {item.moment ? (
                        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">
                          {item.moment === "INAUGURADA"
                            ? "Inaugurada"
                            : "Em implantação"}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {!visible.length ? (
                  <div className="py-14 text-center">
                    <Users className="mx-auto h-6 w-6 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                      Nenhum franqueado encontrado
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Revise o nome ou a unidade pesquisada.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        {error ? (
          <p className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-7">
            {error}
          </p>
        ) : null}

        <footer className="flex flex-col-reverse gap-3 border-t border-[var(--border)] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="hidden text-xs text-[var(--text-secondary)] sm:block">
            Os campos marcados com * são obrigatórios.
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl px-5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {saving
                ? "Salvando..."
                : initial?.id
                  ? "Salvar alterações"
                  : "Criar Live"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function SectionTitle({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-xs font-bold text-[var(--brand-primary)]">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-bold text-[var(--brand-secondary)]">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
    </div>
  );
}
