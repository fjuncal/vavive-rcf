"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Sparkles,
} from "lucide-react";
import {
  QuickContactButtons,
  type ContactChannel,
  type TVFranchisee,
} from "@/components/tv/touch-contact-panel";
import { FranchiseeSelector } from "@/components/tv/franchisee-selector";
import { VaviveLogo } from "@/components/brand/vavive-logo";
import {
  CONTACT_ATTENTION_CONFIG,
  type ContactAttention,
} from "@/lib/contact-attention";

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
type TVPeriod =
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "current_month"
  | "previous_month";
type TVData = {
  periodLabel: string;
  currentMonth: {
    qualifiedContacts: number;
    contactedFranchisees: number;
    totalFranchisees: number;
  };
  franchisees: Franchisee[];
};
const empty: TVData = {
  periodLabel: "",
  currentMonth: {
    qualifiedContacts: 0,
    contactedFranchisees: 0,
    totalFranchisees: 0,
  },
  franchisees: [],
};
const photo =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85";
const metrics = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "telefone", label: "Telefone" },
  { key: "video", label: "Vídeo" },
  { key: "presencial", label: "Presencial" },
  { key: "live", label: "Contatos Live" },
] as const;
const carouselSurfaceByAttention: Record<ContactAttention, string> = {
  em_dia: "bg-gradient-to-br from-[#003b71] via-[#07547b] to-[#0b8f45]",
  atencao: "bg-gradient-to-br from-[#073b5b] via-[#8a5600] to-[#c68100]",
  critico: "bg-gradient-to-br from-[#48152a] via-[#9f1e31] to-[#dc3f32]",
  urgente:
    "bg-gradient-to-br from-[#3d0a1e] via-[#8f102f] to-[#e23b38] animate-pulse",
};
type RecentContact = {
  id: string;
  type: "WHATSAPP" | "TELEFONE" | "VIDEO_CHAMADA" | "PRESENCIAL" | "LIVE";
  contactedAt: string;
  user: { name: string };
};
const channelLabels: Record<RecentContact["type"], string> = {
  WHATSAPP: "WhatsApp",
  TELEFONE: "Telefone",
  VIDEO_CHAMADA: "Vídeo",
  PRESENCIAL: "Presencial",
  LIVE: "Live",
};
function TVContactHistory({ franchiseeId }: { franchiseeId: string }) {
  const [items, setItems] = useState<RecentContact[]>([]);
  useEffect(() => {
    let active = true;
    fetch(`/api/tv/franchisee/${franchiseeId}/history`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [franchiseeId]);
  const latest = items[0];
  return (
    <section className="mt-5 rounded-2xl border border-white/15 bg-[#002f5a]/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#b8ee35]">
          Último contato
        </p>
        {latest && (
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">
            {channelLabels[latest.type]}
          </span>
        )}
      </div>
      {latest ? (
        <p className="mt-2 text-sm text-white">
          {new Date(latest.contactedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}{" "}
          às{" "}
          {new Date(latest.contactedAt).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : (
        <p className="mt-2 text-sm text-white/65">Nenhum contato registrado.</p>
      )}
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-white/55">
          Histórico recente
        </p>
        <div className="space-y-2">
          {items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="font-semibold text-white">
                {channelLabels[item.type]}
              </span>
              <span className="text-right text-white/65">
                {new Date(item.contactedAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}{" "}
                ·{" "}
                {new Date(item.contactedAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
          {!items.length && (
            <p className="text-xs text-white/55">Sem interações anteriores.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function TVPage() {
  const router = useRouter();
  const [data, setData] = useState<TVData>(empty);
  const [period, setPeriod] = useState<TVPeriod>("last_30_days");
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(12);
  const [role, setRole] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [currentData, setCurrentData] = useState<Franchisee | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const active = Math.min(index, Math.max(0, data.franchisees.length - 1));
  const selected = data.franchisees[active];
  const selectedId = selected?.id;
  const current = currentData?.id === selected?.id ? currentData : selected;
  const currentAttention = current
    ? CONTACT_ATTENTION_CONFIG[current.attention]
    : CONTACT_ATTENTION_CONFIG.em_dia;
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
  const refreshCurrent = useCallback(
    async (franchiseeId: string) => {
      detailRequest.current?.abort();
      const controller = new AbortController();
      detailRequest.current = controller;
      try {
        const response = await fetch(
          `/api/tv/franchisee/${franchiseeId}?period=${period}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok || controller.signal.aborted) return;
        const updated = (await response.json()) as Franchisee;
        if (controller.signal.aborted) return;
        setCurrentData(updated);
        setData((previous) => ({
          ...previous,
          franchisees: previous.franchisees.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        }));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          return;
      }
    },
    [period],
  );
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);
  useEffect(() => {
    if (!selectedId) return;
    void refreshCurrent(selectedId);
    return () => detailRequest.current?.abort();
  }, [refreshCurrent, selectedId]);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => setRole(value?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    setSeconds(currentAttention.carouselSeconds);
  }, [current?.id, currentAttention.carouselSeconds]);
  useEffect(() => {
    const interval = window.setInterval(
      () =>
        setSeconds((value) => {
          if (value <= 1) {
            setIndex(
              (current) => (current + 1) % Math.max(1, data.franchisees.length),
            );
            return currentAttention.carouselSeconds;
          }
          return value - 1;
        }),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [currentAttention.carouselSeconds, data.franchisees.length]);
  const list = useMemo(
    () =>
      data.franchisees.map(({ id, name, unitName, photoUrl }) => ({
        id,
        name,
        unitName,
        photoUrl,
      })),
    [data.franchisees],
  );
  const select = (id: string) => {
    const target = data.franchisees.findIndex((item) => item.id === id);
    if (target >= 0) {
      setCurrentData(null);
      setIndex(target);
      setSeconds(
        CONTACT_ATTENTION_CONFIG[data.franchisees[target].attention]
          .carouselSeconds,
      );
    }
  };
  const registerInstantly = useCallback(
    (
      franchiseeId: string,
      type: ContactChannel,
      status: { attention: ContactAttention; daysWithoutContact: number },
    ) => {
      setData((previous) => {
        const target = previous.franchisees.find(
          (item) => item.id === franchiseeId,
        );
        if (!target) return previous;
        const hadQualifiedContact =
          target.telefone + target.video + target.presencial > 0;
        const isQualified = [
          "TELEFONE",
          "VIDEO_CHAMADA",
          "PRESENCIAL",
          "LIVE",
        ].includes(type);
        const key =
          type === "VIDEO_CHAMADA"
            ? "video"
            : type === "PRESENCIAL"
              ? "presencial"
              : type === "TELEFONE"
                ? "telefone"
                : type === "LIVE"
                  ? "live"
                  : "whatsapp";
        return {
          ...previous,
          currentMonth: {
            ...previous.currentMonth,
            qualifiedContacts:
              previous.currentMonth.qualifiedContacts + (isQualified ? 1 : 0),
            contactedFranchisees:
              previous.currentMonth.contactedFranchisees +
              (isQualified && !hadQualifiedContact ? 1 : 0),
          },
          franchisees: previous.franchisees.map((item) =>
            item.id === franchiseeId
              ? {
                  ...item,
                  [key]: item[key] + 1,
                  attention: status.attention,
                  daysWithoutContact: status.daysWithoutContact,
                  lastContact: new Date().toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  }),
                }
              : item,
          ),
        };
      });
      setCurrentData((current) =>
        current?.id === franchiseeId
          ? {
              ...current,
              attention: status.attention,
              daysWithoutContact: status.daysWithoutContact,
              lastContact: new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              }),
            }
          : current,
      );
      void Promise.all([refresh(), refreshCurrent(franchiseeId)]);
    },
    [refresh, refreshCurrent],
  );
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      window.location.assign("/tv/login");
    }
  };
  const percent = data.currentMonth.totalFranchisees
    ? Math.round(
        (data.currentMonth.contactedFranchisees /
          data.currentMonth.totalFranchisees) *
          100,
      )
    : 0;
  return (
    <main className="tv-shell bg-[#eef7ef] text-[#073b36]">
      <div className="tv-frame mx-auto flex max-w-[1920px] flex-col gap-3 lg:gap-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white">
              <VaviveLogo className="h-12 w-12" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#0b8f45]">
                Central VAVIVE
              </p>
              <h1 className="text-xl font-semibold text-[#003b71]">
                Acompanhamento da rede
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                {data.periodLabel}
              </p>
              <p className="font-semibold text-[#003b71]">
                {now.toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as TVPeriod)}
              aria-label="Período exibido na TV"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#003b71] outline-none"
            >
              <option value="last_7_days">Últimos 7 dias</option>
              <option value="last_30_days">Últimos 30 dias</option>
              <option value="last_90_days">Últimos 90 dias</option>
              <option value="current_month">Mês atual</option>
              <option value="previous_month">Mês anterior</option>
            </select>
            {role && role !== "TV" && (
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#003b71] px-4 py-3 text-sm font-semibold text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Painel
              </button>
            )}
            <button
              onClick={() => router.push("/tv/modo")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#003b71]"
            >
              <LayoutGrid className="h-4 w-4" />
              Modos
            </button>
            <button
              onClick={logout}
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
          {current ? (
            <section
              className={`relative min-h-0 overflow-hidden rounded-[32px] shadow-2xl ${carouselSurfaceByAttention[current.attention]} ${currentAttention.carouselClass}`}
            >
              {current.attention === "urgente" && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[#facc15] shadow-[0_0_24px_rgba(250,204,21,0.95)]" />
              )}
              <div className="tv-primary-card flex h-full flex-col p-5 lg:p-6">
                <div>
                  <div className="flex justify-between gap-4">
                    <span className="rounded-full bg-[#b8ee35] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#003b71]">
                      Franqueado em foco
                    </span>
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${currentAttention.tagClass} ${current.attention === "atencao" ? "uppercase tracking-wide" : ""} ${current.attention === "critico" ? "px-5 py-2.5 uppercase tracking-wide" : ""} ${current.attention === "urgente" ? "animate-pulse px-6 py-3 text-base uppercase tracking-[.14em]" : ""}`}
                    >
                      {currentAttention.emoji} {currentAttention.label}
                    </span>
                  </div>
                  <p className="mt-3 text-right text-sm text-white/70">
                    Próxima troca em {seconds}s
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-[#b8ee35] transition-[width] duration-1000"
                      style={{
                        width: `${(seconds / currentAttention.carouselSeconds) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="mt-5 grid min-h-0 flex-1 items-center gap-6 lg:grid-cols-[.7fr_1.3fr]">
                  <img
                    src={current.photoUrl || photo}
                    alt={current.name}
                    className="mx-auto aspect-[4/5] max-h-[min(54vh,580px)] w-full max-w-sm rounded-[28px] object-cover shadow-2xl"
                  />
                  <div className="text-white">
                    <p className="flex items-center gap-2 text-base font-extrabold uppercase tracking-[.22em] text-[#b8ee35]">
                      <Sparkles className="h-5 w-5" />
                      {current.moment === "INAUGURADA"
                        ? "Inaugurada"
                        : "Em implantação"}
                    </p>
                    <h2 className="mt-3 text-5xl font-semibold leading-none xl:text-6xl">
                      {current.name}
                    </h2>
                    <p className="mt-3 text-2xl text-white/70">
                      {current.unitName}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white/80">
                      {current.daysWithoutContact === null
                        ? "Sem contato registrado"
                        : current.daysWithoutContact === 0
                          ? "Último contato: hoje"
                          : `Último contato há ${current.daysWithoutContact} dias`}
                    </p>
                    {current.attention !== "em_dia" && (
                      <div
                        className={`mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${current.attention === "urgente" ? "border-yellow-200/80 bg-yellow-300 text-rose-950 shadow-lg shadow-rose-950/30" : current.attention === "critico" ? "border-red-100/40 bg-red-950/30 text-white" : "border-amber-100/40 bg-amber-950/25 text-amber-50"}`}
                      >
                        <span aria-hidden="true">
                          {current.attention === "urgente" ? "🚨" : "⚠"}
                        </span>
                        {current.attention === "urgente"
                          ? `Ação imediata: ${current.daysWithoutContact} dias sem contato`
                          : `${current.daysWithoutContact} dias sem contato`}
                      </div>
                    )}
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {metrics.map(({ key, label }) => (
                        <div
                          key={key}
                          className="rounded-2xl border border-white/15 bg-white/10 p-4"
                        >
                          <p className="text-3xl font-semibold">
                            {current[key]}
                          </p>
                          <p className="mt-1 text-xs text-white/60">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm">
                      <span className="font-semibold text-[#b8ee35]">
                        Presença em Lives
                      </span>
                      <span>
                        {current.livesAttended} compareceu de{" "}
                        {current.livesInvited} convidado
                        {current.livesInvited === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
                        {current.liveAttendanceRate}% de presença
                      </span>
                    </div>
                    <QuickContactButtons
                      franchisee={current}
                      onSaved={registerInstantly}
                      onUndone={() => void refresh()}
                    />
                  </div>
                </div>
                <div className="mt-4 flex shrink-0 items-center justify-between">
                  <div className="flex gap-2">
                    {data.franchisees.map((item, position) => (
                      <button
                        key={item.id}
                        onClick={() => select(item.id)}
                        className={`h-2 rounded-full ${position === active ? "w-9 bg-[#b8ee35]" : "w-2 bg-white/40"}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        select(
                          data.franchisees[
                            (active - 1 + data.franchisees.length) %
                              data.franchisees.length
                          ].id,
                        )
                      }
                      className="rounded-full border border-white/20 p-3 text-white"
                    >
                      <ChevronLeft />
                    </button>
                    <button
                      onClick={() =>
                        select(
                          data.franchisees[
                            (active + 1) % data.franchisees.length
                          ].id,
                        )
                      }
                      className="rounded-full bg-[#b8ee35] p-3 text-[#003b71]"
                    >
                      <ChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="flex items-center justify-center rounded-[32px] bg-[#003b71] text-white">
              Nenhum franqueado ativo encontrado.
            </section>
          )}
          <aside className="rounded-[32px] bg-white p-5 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0b8f45]">
              Visão da rede
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[#003b71]">
              Acompanhamento
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#eef7ef] p-4">
                <p className="text-3xl font-bold text-[#003b71]">
                  {data.currentMonth.qualifiedContacts}
                </p>
                <p className="text-xs text-slate-500">qualificados</p>
              </div>
              <div className="rounded-2xl bg-[#b8ee35]/35 p-4">
                <p className="text-3xl font-bold text-[#003b71]">{percent}%</p>
                <p className="text-xs text-slate-500">rede contatada</p>
              </div>
            </div>
            <FranchiseeSelector
              franchisees={list}
              selectedId={current?.id}
              onSelect={select}
            />
            <div className="mt-5 rounded-2xl bg-[#f8fbf8] p-4 text-sm leading-6 text-slate-600">
              Use a busca para encontrar qualquer unidade. Os quatro botões de
              comunicação ficam no cartão em destaque.
            </div>
          </aside>
        </div>
        <footer className="flex items-center gap-2 text-xs text-slate-500">
          <Clock3 className="h-4 w-4 text-[#0b8f45]" />
          Atualização automática a cada minuto.
          <Activity className="ml-3 h-4 w-4 text-[#0b8f45]" />
          {data.franchisees.length} franqueados disponíveis.
        </footer>
      </div>
    </main>
  );
}
