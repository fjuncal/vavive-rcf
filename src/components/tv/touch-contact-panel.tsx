"use client";
import { useEffect, useState } from "react";
import { MessageCircle, Phone, Users, Video } from "lucide-react";
export type TVFranchisee = {
  id: string;
  name: string;
  unitName: string;
  photoUrl?: string | null;
};
export type ContactChannel =
  "WHATSAPP" | "TELEFONE" | "VIDEO_CHAMADA" | "PRESENCIAL";
type Recent = {
  id: string;
  type: ContactChannel;
  contactedAt: string;
  user: { name: string };
};
const channels = [
  { type: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { type: "TELEFONE", label: "Telefone", icon: Phone },
  { type: "VIDEO_CHAMADA", label: "Vídeo", icon: Video },
  { type: "PRESENCIAL", label: "Presencial", icon: Users },
] as const;
const labels: Record<ContactChannel, string> = {
  WHATSAPP: "WhatsApp",
  TELEFONE: "Telefone",
  VIDEO_CHAMADA: "Vídeo",
  PRESENCIAL: "Presencial",
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
}: {
  franchisee: TVFranchisee;
  onSaved: (id: string, type: ContactChannel) => void;
}) {
  const [saved, setSaved] = useState<ContactChannel | null>(null);
  const [saving, setSaving] = useState<ContactChannel | null>(null);
  const [history, setHistory] = useState<Recent[]>([]);
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
      setSaved(type);
      window.setTimeout(() => setSaved(null), 1800);
    } finally {
      setSaving(null);
    }
  }
  const latest = history[0];
  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-medium text-white/70">
        Registrar comunicação
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {channels.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            disabled={Boolean(saving)}
            onClick={() => save(type)}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition disabled:opacity-70 ${saved === type ? "border-[#b8ee35] bg-[#b8ee35] text-[#003b71]" : "border-white/20 bg-white/10 text-white"}`}
          >
            <Icon className="h-4 w-4" />
            {saving === type ? "Salvando..." : saved === type ? "Salvo" : label}
          </button>
        ))}
      </div>
      <section className="mt-3 rounded-2xl border border-white/15 bg-[#002f5a]/30 p-3.5">
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
          <p className="mt-2 text-sm text-white">
            {date(latest.contactedAt)} às {time(latest.contactedAt)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/65">
            Nenhum contato registrado.
          </p>
        )}
        <div className="mt-3 border-t border-white/10 pt-2.5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-white/55">
            Histórico recente
          </p>
          <div className="space-y-1.5">
            {history.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="font-semibold text-white">
                  {labels[item.type]}
                </span>
                <span className="text-right text-white/65">
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
    </div>
  );
}
