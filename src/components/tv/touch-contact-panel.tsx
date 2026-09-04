"use client";
import { useEffect, useState } from "react";
import { MessageCircle, Phone, Radio, Users, Video } from "lucide-react";
export type TVFranchisee = {
  id: string;
  name: string;
  unitName: string;
  photoUrl?: string | null;
};
export type ContactChannel =
  "WHATSAPP" | "TELEFONE" | "VIDEO_CHAMADA" | "PRESENCIAL" | "LIVE";
type Recent = {
  id: string;
  type: ContactChannel | "LIVE";
  contactedAt: string;
  user: { name: string };
};
const channels = [
  { type: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { type: "TELEFONE", label: "Telefone", icon: Phone },
  { type: "VIDEO_CHAMADA", label: "Vídeo", icon: Video },
  { type: "PRESENCIAL", label: "Presencial", icon: Users },
  { type: "LIVE", label: "Live", icon: Radio },
] as const;
const labels: Record<Recent["type"], string> = {
  WHATSAPP: "WhatsApp",
  TELEFONE: "Telefone",
  VIDEO_CHAMADA: "Vídeo",
  PRESENCIAL: "Presencial",
  LIVE: "Live",
};
const date = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
const time = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
export function QuickContactButtons({
  franchisee,
  onSaved,
  onUndone,
  compact = false,
  dense = false,
}: {
  franchisee: TVFranchisee;
  onSaved: (id: string, type: ContactChannel) => void;
  onUndone?: () => void;
  compact?: boolean;
  dense?: boolean;
}) {
  const [saved, setSaved] = useState<ContactChannel | null>(null);
  const [saving, setSaving] = useState<ContactChannel | null>(null);
  const [history, setHistory] = useState<Recent[]>([]);
  const [undo, setUndo] = useState<Recent | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/tv/franchisee/${franchisee.id}/history`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((items) => {
        if (live) setHistory(items);
      })
      .catch(() => {
        if (live) setHistory([]);
      });
    return () => {
      live = false;
    };
  }, [franchisee.id]);
  async function save(type: ContactChannel) {
    if (saving) return;
    setSaving(type);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          franchiseeId: franchisee.id,
          type,
          contactedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) return;
      const item = await response.json();
      setHistory((current) =>
        [
          {
            id: item.id,
            type: item.type,
            contactedAt: item.contactedAt,
            user: item.user,
          },
          ...current,
        ].slice(0, 5),
      );
      onSaved(franchisee.id, type);
      setUndo({
        id: item.id,
        type: item.type,
        contactedAt: item.contactedAt,
        user: item.user,
      });
      window.setTimeout(() => setUndo(null), 15_000);
      setSaved(type);
      window.setTimeout(() => setSaved(null), 1800);
    } finally {
      setSaving(null);
    }
  }
  async function undoLast() {
    if (!undo) return;
    const response = await fetch("/api/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: undo.id }),
    });
    if (!response.ok) return;
    setHistory((items) => items.filter((item) => item.id !== undo.id));
    setUndo(null);
    onUndone?.();
  }
  const latest = history[0];
  return (
    <div className={dense ? "mt-2" : compact ? "mt-3" : "mt-4"}>
      <p
        className={`${dense ? "sr-only" : "mb-2"} font-medium text-white/70 ${compact ? "text-xs" : "text-sm"}`}
      >
        Registrar comunicação
      </p>
      <div
        className={`grid grid-cols-5 gap-2 ${compact ? "text-[10px]" : "text-sm"}`}
      >
        {channels.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            disabled={Boolean(saving)}
            onClick={() => save(type)}
            className={`flex items-center justify-center gap-1 rounded-xl border font-semibold transition disabled:opacity-70 ${dense ? "min-h-10 px-0.5 text-[10px]" : compact ? "min-h-10 px-1" : "min-h-14 gap-2 text-sm"} ${saved === type ? "border-[#b8ee35] bg-[#b8ee35] text-[#003b71]" : "border-white/20 bg-white/10 text-white"}`}
          >
            <Icon className="h-4 w-4" />
            {saving === type ? "Salvando..." : saved === type ? "Salvo" : label}
          </button>
        ))}
      </div>
      {undo && (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-[min(92vw,580px)] -translate-x-1/2 items-center justify-between gap-5 rounded-2xl border border-[#b8ee35]/50 bg-[#003b71] px-5 py-4 text-white shadow-2xl">
          <span>
            <b className="block text-base">Contato registrado</b>
            <small className="text-white/70">
              Toque em desfazer se foi engano. Disponível por 15 segundos.
            </small>
          </span>
          <button
            onClick={undoLast}
            className="rounded-xl bg-[#b8ee35] px-5 py-3 font-bold text-[#003b71]"
          >
            Desfazer
          </button>
        </div>
      )}
      {!compact ? (
        <section className="mt-3 rounded-2xl border border-white/15 bg-[#002f5a]/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#b8ee35]">
              Último contato
            </p>
            {latest && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white">
                {labels[latest.type]}
              </span>
            )}
          </div>
          {latest ? (
            <p className="mt-1 text-sm text-white">
              {date(latest.contactedAt)} às {time(latest.contactedAt)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-white/65">
              Nenhum contato registrado.
            </p>
          )}
          <div className="mt-2 border-t border-white/10 pt-2">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-[.18em] text-white/55">
              Histórico recente
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {history.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate font-semibold text-white">
                    {labels[item.type]}
                  </span>
                  <span className="shrink-0 text-right text-white/65">
                    {date(item.contactedAt)} · {time(item.contactedAt)}
                  </span>
                </div>
              ))}
              {!history.length && (
                <p className="text-xs text-white/55">
                  Sem interações anteriores.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section
          className={`rounded-xl border border-white/15 bg-[#002f5a]/30 ${dense ? "mt-1 px-2 py-1.5" : "mt-2 px-3 py-2.5"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#b8ee35]">
              Histórico recente
            </p>
            {latest ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
                Último: {labels[latest.type]}
              </span>
            ) : null}
          </div>
          {history.length ? (
            <div
              className={`grid gap-x-3 text-[10px] ${dense ? "mt-1 grid-cols-1" : "mt-1.5 grid-cols-2"}`}
            >
              {history.slice(0, dense ? 1 : 2).map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 items-center justify-between gap-2 text-white/75"
                >
                  <span className="truncate font-semibold text-white">
                    {labels[item.type]}
                  </span>
                  <span className="shrink-0">
                    {date(item.contactedAt)} · {time(item.contactedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-white/55">
              Nenhum contato registrado.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
