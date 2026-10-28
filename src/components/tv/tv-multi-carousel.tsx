"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Pause,
  Play,
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
import {
  UnitNames,
  UnitPhotos,
  type UnitMember,
} from "@/components/tv/unit-members";
import { VaviveLogo } from "@/components/brand/vavive-logo";
import { BirthdayHighlights, UnitBirthdayBadge } from "@/components/tv/birthday-highlights";
import type { TVBirthday, TVBirthdayMonths } from "@/components/tv/birthday-types";

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
  hasContact: boolean;
  members: UnitMember[];
};

type TVData = {
  periodLabel: string;
  franchisees: Franchisee[];
  birthdays: TVBirthday[];
  birthdayMonths?: TVBirthdayMonths;
};

const empty: TVData = { periodLabel: "", franchisees: [], birthdays: [] };
const TV_DATA_REFRESH_MS = 60_000;

function getPageIds(franchisees: Franchisee[], start: number, slots: Slots) {
  if (!franchisees.length) return [];
  return Array.from(
    { length: Math.min(slots, franchisees.length) },
    (_, offset) => franchisees[(start + offset) % franchisees.length].id,
  );
}

function getRotationSecondsForIds(franchisees: Franchisee[], ids: string[]) {
  return Math.max(
    12,
    ...ids.map((id) => {
      const franchisee = franchisees.find((item) => item.id === id);
      return franchisee
        ? CONTACT_ATTENTION_CONFIG[franchisee.attention].carouselSeconds
        : 12;
    }),
  );
}

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
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const refreshRequest = useRef<AbortController | null>(null);
  const refreshSequence = useRef(0);
  const dataRef = useRef<TVData>(empty);
  const startRef = useRef(0);
  const visibleIdsRef = useRef<string[]>([]);
  const pausedRef = useRef(false);
  const rotationSecondsRef = useRef(12);
  const visible = useMemo(() => {
    return visibleIds
      .map((id) => data.franchisees.find((item) => item.id === id))
      .filter((item): item is Franchisee => Boolean(item));
  }, [data.franchisees, visibleIds]);
  const rotationSeconds = getRotationSecondsForIds(
    data.franchisees,
    visibleIds,
  );
  const [seconds, setSeconds] = useState(rotationSeconds);

  const refresh = useCallback(async () => {
    if (refreshRequest.current) return;
    const controller = new AbortController();
    const sequence = ++refreshSequence.current;
    refreshRequest.current = controller;
    try {
      const response = await fetch("/api/tv?period=" + period, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status === 401) {
        router.replace("/tv/login");
        return;
      }
      if (!response.ok || controller.signal.aborted) return;
      const next = (await response.json()) as TVData;
      if (controller.signal.aborted || sequence !== refreshSequence.current) return;

      const previous = dataRef.current;
      const previousIds = visibleIdsRef.current.length
        ? visibleIdsRef.current
        : getPageIds(previous.franchisees, startRef.current, slots);
      const nextCount = Math.min(slots, next.franchisees.length);
      const nextIds = new Set(next.franchisees.map((item) => item.id));
      const preservedIds = previousIds.filter((id) => nextIds.has(id));
      const fallbackStart = Math.max(
        0,
        next.franchisees.findIndex((item) => item.id === previousIds[0]),
      );
      const fallbackIds = getPageIds(next.franchisees, fallbackStart, slots);
      const nextVisibleIds = [
        ...preservedIds,
        ...fallbackIds.filter((id) => !preservedIds.includes(id)),
      ].slice(0, nextCount);
      const nextStart = next.franchisees.findIndex(
        (item) => item.id === nextVisibleIds[0],
      );
      const nextRotationSeconds = getRotationSecondsForIds(
        next.franchisees,
        nextVisibleIds,
      );
      dataRef.current = next;
      setData(next);
      visibleIdsRef.current = nextVisibleIds;
      setVisibleIds(nextVisibleIds);
      startRef.current = nextStart >= 0 ? nextStart : 0;
      setSeconds((current) =>
        previous.franchisees.length === 0 && next.franchisees.length > 0
          ? nextRotationSeconds
          : pausedRef.current
            ? current
            : Math.min(current, nextRotationSeconds),
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        return;
    } finally {
      if (refreshRequest.current === controller) refreshRequest.current = null;
    }
  }, [period, router, slots]);

  useEffect(() => {
    const interval = window.setInterval(refresh, TV_DATA_REFRESH_MS);
    return () => {
      window.clearInterval(interval);
      refreshSequence.current += 1;
      refreshRequest.current?.abort();
      refreshRequest.current = null;
    };
  }, [refresh]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    dataRef.current = data;
    rotationSecondsRef.current = rotationSeconds;
  }, [data, rotationSeconds]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => setRole(value?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  const advance = useCallback(
    (direction: -1 | 1, resetTimer = true) => {
      const franchisees = dataRef.current.franchisees;
      if (!franchisees.length) return;
      const anchorId = direction === 1
        ? visibleIdsRef.current[visibleIdsRef.current.length - 1]
        : visibleIdsRef.current[0];
      const currentIndex = franchisees.findIndex(
        (item) => item.id === anchorId,
      );
      const baseIndex = currentIndex >= 0 ? currentIndex : startRef.current;
      const rawNextStart = baseIndex + (direction === 1 ? 1 : -slots);
      const nextStart =
        ((rawNextStart % franchisees.length) + franchisees.length) %
        franchisees.length;
      const nextIds = getPageIds(franchisees, nextStart, slots);
      const nextRotationSeconds = getRotationSecondsForIds(franchisees, nextIds);
      startRef.current = nextStart;
      visibleIdsRef.current = nextIds;
      setVisibleIds(nextIds);
      rotationSecondsRef.current = nextRotationSeconds;
      if (resetTimer) {
        setSeconds(nextRotationSeconds);
      }
    },
    [slots],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (pausedRef.current) return;
      setSeconds((value) => {
        if (value <= 1) {
          advance(1, false);
          return rotationSecondsRef.current;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [advance]);

  const togglePaused = () => {
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    if (!nextPaused) {
      setSeconds(
        getRotationSecondsForIds(
          dataRef.current.franchisees,
          visibleIdsRef.current,
        ),
      );
    }
  };

  const registerInstantly = useCallback(
    (
      franchiseeId: string,
      type: ContactChannel,
      status: { attention: ContactAttention; daysWithoutContact: number },
    ) => {
      const key = contactKey(type);
      setData((previous) => {
        const next = {
          ...previous,
          franchisees: previous.franchisees.map((item) =>
          item.id === franchiseeId
            ? {
                ...item,
                [key]: item[key] + 1,
                attention: status.attention,
                daysWithoutContact: status.daysWithoutContact,
              }
            : item,
          ),
        };
        dataRef.current = next;
        return next;
      });
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
    <main className="tv-shell bg-[#eef7ef] text-[#073b36]">
      <div className="tv-frame mx-auto flex max-w-[1920px] flex-col gap-3 lg:gap-5">
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
            <span className="text-right text-sm text-white/75" aria-live="polite">
              {paused ? "Rotação pausada" : `Próxima troca em ${seconds}s`}
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
          <section className="tv-multi-layout grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,270px)]">
            <div
              className={`tv-multi-card-grid order-2 grid min-h-0 min-w-0 gap-5 xl:order-1 ${slots === 4 ? "tv-multi-card-grid--compact" : ""} ${slots === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-[repeat(2,minmax(0,1fr))] md:grid-rows-[repeat(2,minmax(0,1fr))]"}`}
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
            </div>
            <aside className="order-1 flex min-h-0 min-w-0 max-h-28 flex-col overflow-y-auto xl:order-2 xl:max-h-none xl:overflow-hidden">
              <BirthdayHighlights
                birthdays={data.birthdays}
                birthdayMonths={data.birthdayMonths}
                compact
                sidebar
                fill
              />
            </aside>
          </section>
        ) : (
          <section className="flex flex-1 items-center justify-center rounded-3xl bg-[#003b71] text-white">
            Nenhum franqueado ativo encontrado.
          </section>
        )}

        <footer className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={togglePaused}
            aria-label={paused ? "Continuar rotação automática" : "Pausar rotação automática"}
            aria-pressed={paused}
            title={paused ? "Continuar rotação automática" : "Pausar rotação automática"}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b8f45] ${paused ? "border-[#0b8f45] bg-[#dff3df] text-[#003b71]" : "border-slate-200 bg-white text-[#003b71]"}`}
          >
            {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
            {paused ? "Continuar" : "Pausar"}
          </button>
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
  onSaved: (
    id: string,
    type: ContactChannel,
    status: { attention: ContactAttention; daysWithoutContact: number },
  ) => void;
  onUndone: () => void;
}) {
  const attention = CONTACT_ATTENTION_CONFIG[franchisee.attention];
  return (
    <article
      className={`tv-multi-card ${compact ? "tv-multi-card--compact" : ""} flex min-h-0 min-w-0 flex-col rounded-[28px] border-2 text-white shadow-xl ${compact ? "p-3" : "overflow-hidden p-6"} ${attention.surfaceClass} ${attention.carouselClass}`}
    >
      <div className="tv-multi-header flex min-w-0 items-start justify-between gap-3">
        <span
          className={`rounded-full font-extrabold ${compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs"} ${attention.tagClass}`}
        >
          {attention.emoji} {attention.label}
        </span>
        <span className={`text-right text-xs font-semibold text-white/75 ${compact ? "max-w-[48%] min-w-0 truncate" : ""}`}>
          {franchisee.daysWithoutContact === null
            ? "Sem contato"
            : !franchisee.hasContact
              ? `Nenhum contato há ${franchisee.daysWithoutContact} dias`
              : franchisee.daysWithoutContact === 0
                ? "Contato hoje"
                : `Há ${franchisee.daysWithoutContact} dias`}
        </span>
      </div>
      <div
        className={`tv-multi-member flex min-w-0 items-center ${compact ? "mt-3 gap-3" : "mt-5 gap-4 lg:gap-5"}`}
      >
        <UnitPhotos
          layout="avatar"
          avatarClassName={compact ? "tv-multi-card-avatar h-14 w-14" : "h-28 w-28"}
          members={franchisee.members}
          fallbackName={franchisee.name}
          fallbackPhoto={franchisee.photoUrl}
        />
        <div className="tv-multi-member-copy min-w-0">
          <p
            className={`tv-multi-moment flex items-center gap-2 font-extrabold uppercase tracking-[.16em] text-[#b8ee35] ${compact ? "text-[9px]" : "text-xs"}`}
          >
            <Sparkles className="h-4 w-4" />
            {franchisee.moment === "INAUGURADA"
              ? "Inaugurada"
              : "Em implantação"}
          </p>
          <h2
            className={`tv-multi-name truncate font-semibold leading-none ${compact ? "mt-1 text-xl" : "mt-2 text-4xl"}`}
          >
            <UnitNames
              members={franchisee.members}
              fallbackName={franchisee.name}
            />
          </h2>
          <p
            className={`tv-multi-unit truncate text-white/70 ${compact ? "mt-1 text-sm" : "mt-2 text-xl"}`}
          >
            {franchisee.unitName}
          </p>
          <div className="tv-multi-birthday">
            <UnitBirthdayBadge members={franchisee.members} compact />
          </div>
        </div>
      </div>
      <div
        className={`tv-multi-stats grid gap-2 ${compact ? "mt-3 grid-cols-4" : "mt-5 grid-cols-5"}`}
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
        className={`tv-multi-live flex rounded-xl border border-white/15 bg-white/10 text-xs ${compact ? "mt-2 flex-nowrap items-center justify-between gap-1 px-2 py-1.5 text-[10px]" : "mt-3 flex-wrap gap-2 px-3 py-2"}`}
      >
        <span className="font-semibold text-[#b8ee35]">Presença em Lives</span>
        <span>
          {franchisee.livesAttended}/{franchisee.livesInvited}
        </span>
        <span className="font-bold">{franchisee.liveAttendanceRate}%</span>
      </div>
      <div className={`tv-contact-actions min-w-0 shrink-0 ${compact ? "" : "mt-auto"}`}>
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
    <span className="tv-multi-stat rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-center">
      <b className="block text-lg leading-none">{value}</b>
      <small className="mt-1 block text-[10px] text-white/65">{label}</small>
    </span>
  );
}
