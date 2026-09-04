"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Sparkles,
  Users,
} from "lucide-react";
import {
  QuickContactButtons,
  type ContactChannel,
  type TVFranchisee,
} from "@/components/tv/touch-contact-panel";
import {
  CONTACT_ATTENTION_CONFIG,
  type ContactAttention,
} from "@/lib/contact-attention";
import { VaviveLogo } from "@/components/brand/vavive-logo";

type Slots = 2 | 4;
type TVPeriod =
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "current_month"
  | "previous_month";

type Franchisee = TVFranchisee & {
  moment: "IMPLANTACAO" | "INAUGURADA";
  whatsapp: number;
  telefone: number;
  video: number;
  presencial: number;
  live: number;
  livesInvited: number;
  livesAttended: number;
  liveAttendanceRate: number;
  lastContact: string | null;
  daysWithoutContact: number | null;
  attention: ContactAttention;
};

type TVData = {
  periodLabel: string;
  franchisees: Franchisee[];
};

const empty: TVData = { periodLabel: "", franchisees: [] };

function contactKey(type: ContactChannel) {
  if (type === "VIDEO_CHAMADA") return "video";
  if (type === "PRESENCIAL") return "presencial";
  if (type === "TELEFONE") return "telefone";
  if (type === "LIVE") return "live";
  return "whatsapp";
}

export function TVMultiCarousel({ slots }: { slots: Slots }) {
  const router = useRouter();
  const [data, setData] = useState<TVData>(empty);
  const [period, setPeriod] = useState<TVPeriod>("last_30_days");
  const [start, setStart] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const visible = useMemo(() => {
    if (!data.franchisees.length) return [];
    return Array.from(
      { length: Math.min(slots, data.franchisees.length) },
      (_, offset) =>
        data.franchisees[(start + offset) % data.franchisees.length],
    );
  }, [data.franchisees, slots, start]);
  const rotationSeconds = Math.max(
    12,
    ...visible.map(
      (item) => CONTACT_ATTENTION_CONFIG[item.attention].carouselSeconds,
    ),
  );
  const [seconds, setSeconds] = useState(rotationSeconds);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/tv?period=" + period, {
        cache: "no-store",
      });
      if (response.status === 401) {
        router.replace("/tv/login");
        return;
      }
      if (response.ok) setData(await response.json());
    } catch {}
  }, [period, router]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => setRole(value?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {
    setSeconds(rotationSeconds);
  }, [rotationSeconds, start]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setStart(
            (current) =>
              (current + slots) % Math.max(1, data.franchisees.length),
          );
          return rotationSeconds;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [data.franchisees.length, rotationSeconds, slots]);

  const advance = (direction: -1 | 1) => {
    setStart(
      (current) =>
        (current + direction * slots + data.franchisees.length) %
        Math.max(1, data.franchisees.length),
    );
  };

  const registerInstantly = useCallback(
    (franchiseeId: string, type: ContactChannel) => {
      const key = contactKey(type);
      setData((previous) => ({
        ...previous,
        franchisees: previous.franchisees.map((item) =>
          item.id === franchiseeId ? { ...item, [key]: item[key] + 1 } : item,
        ),
      }));
      void refresh();
    },
    [refresh],
  );

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      window.location.assign("/tv/login");
    }
  };

  return (
    <main className="min-h-screen bg-[#eef7ef] p-5 text-[#073b36] lg:p-8">
      <div className="mx-auto flex h-[calc(100vh-2.5rem)] max-w-[1920px] flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white">
              <VaviveLogo className="h-12 w-12" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#0b8f45]">
                Central VAVIVE
              </p>
              <h1 className="text-xl font-semibold text-[#003b71]">
                Carrossel com {slots} franqueados
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="hidden text-right text-xs font-semibold uppercase tracking-wider text-slate-500 lg:block">
              {data.periodLabel}
            </span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as TVPeriod)}
              aria-label="Período exibido na TV"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#003b71]"
            >
              <option value="last_7_days">Últimos 7 dias</option>
              <option value="last_30_days">Últimos 30 dias</option>
              <option value="last_90_days">Últimos 90 dias</option>
              <option value="current_month">Mês atual</option>
              <option value="previous_month">Mês anterior</option>
            </select>
            {role && role !== "TV" ? (
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#003b71] px-4 text-sm font-semibold text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Painel
              </Link>
            ) : null}
            <Link
              href="/tv/modo"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#003b71]"
            >
              <LayoutGrid className="h-4 w-4" />
              Modos
            </Link>
            <button
              onClick={logout}
              aria-label="Sair"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="rounded-2xl bg-[#003b71] px-5 py-4 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-[#b8ee35]" />
              Exibindo {visible.length} de {data.franchisees.length} franqueados
            </span>
            <span className="text-sm text-white/75">
              Próxima troca em {seconds}s
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-[#b8ee35] transition-[width] duration-1000"
              style={{ width: `${(seconds / rotationSeconds) * 100}%` }}
            />
          </div>
        </section>

        {visible.length ? (
          <section
            className={`grid min-h-0 flex-1 gap-5 ${slots === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 md:grid-rows-2"}`}
          >
            {visible.map((franchisee) => (
              <FranchiseeCard
                key={franchisee.id}
                franchisee={franchisee}
                compact={slots === 4}
                onSaved={registerInstantly}
                onUndone={() => void refresh()}
              />
            ))}
          </section>
        ) : (
          <section className="flex flex-1 items-center justify-center rounded-3xl bg-[#003b71] text-white">
            Nenhum franqueado ativo encontrado.
          </section>
        )}

        <footer className="flex items-center justify-center gap-3">
          <button
            onClick={() => advance(-1)}
            aria-label="Franqueados anteriores"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#003b71]"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => advance(1)}
            aria-label="Próximos franqueados"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#b8ee35] text-[#003b71]"
          >
            <ChevronRight />
          </button>
        </footer>
      </div>
    </main>
  );
}

function FranchiseeCard({
  franchisee,
  compact,
  onSaved,
  onUndone,
}: {
  franchisee: Franchisee;
  compact: boolean;
  onSaved: (id: string, type: ContactChannel) => void;
  onUndone: () => void;
}) {
  const attention = CONTACT_ATTENTION_CONFIG[franchisee.attention];
  return (
    <article
      className={`flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 bg-gradient-to-br from-[#003b71] via-[#07547b] to-[#0b8f45] text-white shadow-xl ${compact ? "p-3" : "p-6"} ${attention.carouselClass} ${franchisee.attention === "urgente" ? "animate-pulse" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full font-extrabold ${compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs"} ${attention.tagClass}`}
        >
          {attention.emoji} {attention.label}
        </span>
        <span className="text-right text-xs font-semibold text-white/75">
          {franchisee.daysWithoutContact === null
            ? "Sem contato"
            : franchisee.daysWithoutContact === 0
              ? "Contato hoje"
              : `Há ${franchisee.daysWithoutContact} dias`}
        </span>
      </div>
      <div
        className={`flex min-w-0 items-center ${compact ? "mt-3 gap-3" : "mt-5 gap-4 lg:gap-5"}`}
      >
        <img
          src={
            franchisee.photoUrl ||
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80"
          }
          alt={franchisee.name}
          className={`shrink-0 rounded-2xl object-cover shadow-lg ${compact ? "h-14 w-14" : "h-28 w-28"}`}
        />
        <div className="min-w-0">
          <p
            className={`flex items-center gap-2 font-extrabold uppercase tracking-[.16em] text-[#b8ee35] ${compact ? "text-[9px]" : "text-xs"}`}
          >
            <Sparkles className="h-4 w-4" />
            {franchisee.moment === "INAUGURADA"
              ? "Inaugurada"
              : "Em implantação"}
          </p>
          <h2
            className={`truncate font-semibold leading-none ${compact ? "mt-1 text-xl" : "mt-2 text-4xl"}`}
          >
            {franchisee.name}
          </h2>
          <p
            className={`truncate text-white/70 ${compact ? "mt-1 text-sm" : "mt-2 text-xl"}`}
          >
            {franchisee.unitName}
          </p>
        </div>
      </div>
      <div
        className={`grid gap-2 ${compact ? "mt-3 grid-cols-4" : "mt-5 grid-cols-5"}`}
      >
        <Stat label="WhatsApp" value={franchisee.whatsapp} />
        <Stat label="Telefone" value={franchisee.telefone} />
        <Stat label="Vídeo" value={franchisee.video} />
        {!compact ? (
          <Stat label="Presencial" value={franchisee.presencial} />
        ) : null}
        <Stat label="Live" value={franchisee.live} />
      </div>
      <div
        className={`flex flex-wrap gap-2 rounded-xl border border-white/15 bg-white/10 text-xs ${compact ? "mt-2 px-2 py-1.5 text-[10px]" : "mt-3 px-3 py-2"}`}
      >
        <span className="font-semibold text-[#b8ee35]">Presença em Lives</span>
        <span>
          {franchisee.livesAttended}/{franchisee.livesInvited}
        </span>
        <span className="font-bold">{franchisee.liveAttendanceRate}%</span>
      </div>
      <div className="mt-auto">
        <QuickContactButtons
          compact={compact}
          dense={compact}
          franchisee={franchisee}
          onSaved={onSaved}
          onUndone={onUndone}
        />
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-center">
      <b className="block text-lg leading-none">{value}</b>
      <small className="mt-1 block text-[10px] text-white/65">{label}</small>
    </span>
  );
}
