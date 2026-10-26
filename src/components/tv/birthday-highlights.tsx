"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Cake, Gift, Sparkles, X } from "lucide-react";
import { getTodayCivilDate } from "@/lib/utils";
import type {
  TVBirthday,
  TVBirthdayMonth,
  TVBirthdayMonths,
} from "@/components/tv/birthday-types";
import type { UnitMember } from "@/components/tv/unit-members";

const FALLBACK_PHOTO =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=80";
const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function dateLabel(item: TVBirthday) {
  return `${String(item.day).padStart(2, "0")} ${MONTHS[item.month - 1]}`;
}

function monthName(month: number) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthLabel(month: TVBirthdayMonth) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function currentMonthLabel() {
  return monthName(Number(getTodayCivilDate().slice(5, 7)));
}

function fallbackBirthdayMonths(birthdays: TVBirthday[]): TVBirthdayMonths {
  const today = getTodayCivilDate();
  const currentDate = new Date(`${today}T00:00:00Z`);
  const nextDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1));
  return {
    current: {
      year: currentDate.getUTCFullYear(),
      month: currentDate.getUTCMonth() + 1,
      birthdays,
    },
    next: {
      year: nextDate.getUTCFullYear(),
      month: nextDate.getUTCMonth() + 1,
      birthdays: [],
    },
  };
}

function BirthdayCard({ item }: { item: TVBirthday }) {
  const today = item.status === "today";
  return (
    <article
      className={`flex min-w-0 items-center gap-3 rounded-2xl border p-2.5 ${
        today
          ? "border-[#f09a7d]/70 bg-[#fff4ed]"
          : item.status === "week"
            ? "border-[#b8ee35]/60 bg-[#f4fbe2]"
            : "border-slate-200 bg-white"
      }`}
    >
      <img
        src={item.photoUrl || FALLBACK_PHOTO}
        alt={item.memberName}
        className="h-11 w-11 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#003b71]">{item.memberName}</p>
        <p className="truncate text-xs text-slate-500">{item.unitName}</p>
        <p className={`text-[11px] font-bold ${today ? "text-[#d65f43]" : "text-[#0b8f45]"}`}>
          {today ? `Feliz aniversário! · ${dateLabel(item)}` : dateLabel(item)}
        </p>
      </div>
    </article>
  );
}

function CompactBirthdayStrip({ birthdays }: { birthdays: TVBirthday[] }) {
  const [open, setOpen] = useState(false);
  const preview = birthdays.slice(0, 3);
  const extra = birthdays.length - preview.length;
  return (
    <>
      <section className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-[#003b71]/10 bg-white px-3 py-2 shadow-md">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#003b71] text-[#b8ee35]">
          <Cake className="h-4 w-4" />
        </span>
        <div className="hidden shrink-0 sm:block">
          <p className="text-xs font-bold text-[#003b71]">Aniversariantes do mês</p>
          <p className="text-[10px] text-slate-500">{currentMonthLabel()}</p>
          <p className="text-[10px] text-slate-500">{birthdays.length} {birthdays.length === 1 ? "pessoa" : "pessoas"}</p>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {preview.map((item) => (
            <div
              key={item.memberId}
              title={`${item.memberName} · ${item.unitName} · ${dateLabel(item)}`}
              className={`flex min-w-[132px] shrink-0 items-center gap-1.5 rounded-xl border px-2 py-1 ${item.status === "today" ? "border-[#f09a7d]/70 bg-[#fff1e9]" : item.status === "week" ? "border-[#b8ee35]/70 bg-[#f4fbe2]" : "border-slate-200 bg-slate-50"}`}
            >
              <img src={item.photoUrl || FALLBACK_PHOTO} alt="" className="h-7 w-7 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0">
                <b className="block truncate text-[11px] text-[#003b71]">
                  {item.memberName}
                  {item.status === "today" ? (
                    <span
                      role="img"
                      aria-label="Aniversário hoje"
                      className="ml-1 inline-block align-middle text-[21px] leading-[0]"
                    >
                      🎂
                    </span>
                  ) : null}
                </b>
                <span className={`block truncate text-[10px] font-semibold ${item.status === "today" ? "text-[#d65f43]" : "text-slate-500"}`}>
                  {item.status === "today" ? `Hoje · ${dateLabel(item)}` : `${dateLabel(item)} · ${item.unitName}`}
                </span>
              </span>
            </div>
          ))}
        </div>
        {extra > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-xl bg-[#003b71] px-2.5 py-2 text-[11px] font-bold text-white transition hover:bg-[#07547b] focus:outline-none focus:ring-2 focus:ring-[#b8ee35]"
          >
            +{extra}
          </button>
        ) : null}
      </section>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#003b71]/60 p-5 backdrop-blur-sm">
          <section className="w-full max-w-2xl rounded-[28px] bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Aniversariantes">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#0b8f45]">Aniversariantes do mês</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#003b71]">Todos os aniversariantes</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar aniversariantes">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid max-h-[70vh] gap-2 overflow-y-auto sm:grid-cols-2">
              {birthdays.map((item) => <BirthdayCard key={item.memberId} item={item} />)}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

type BirthdayGroup = {
  status: TVBirthday["status"];
  items: TVBirthday[];
};

type BirthdayPage = {
  groups: BirthdayGroup[];
};

type BirthdayGroupMetrics = {
  status: BirthdayGroup["status"];
  rowHeights: number[];
  rowGap: number;
  overhead: number;
};

function BirthdayRow({
  item,
  compact,
  dataBirthdayId,
}: {
  item: TVBirthday;
  compact: boolean;
  dataBirthdayId?: string;
}) {
  const today = item.status === "today";
  const week = item.status === "week";
  return (
    <article
      data-birthday-id={dataBirthdayId}
      className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border ${compact ? "p-1.5" : "p-2"} ${
        today
          ? "border-[#f09a7d]/75 bg-[#fff1e9] shadow-sm"
          : week
            ? "border-[#b8ee35]/70 bg-[#f4fbe2]"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          title={item.memberName}
          className={`${compact ? "text-xs" : "text-sm"} break-words font-bold leading-tight text-[#003b71]`}
        >
          {item.memberName}
          {today ? (
            <span
              role="img"
              aria-label="Aniversário hoje"
              className="ml-1 inline-block align-middle text-[21px] leading-[0]"
            >
              🎂
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">{item.unitName}</p>
      </div>
      <span className={`shrink-0 whitespace-nowrap text-[10px] font-extrabold ${today ? "text-[#d65f43]" : week ? "text-[#0b8f45]" : "text-slate-500"}`}>
        {dateLabel(item)}
      </span>
    </article>
  );
}

function BirthdayGroupHeading({ status }: { status: BirthdayGroup["status"] }) {
  if (status === "today") {
    return (
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#d65f43]">
        <Gift className="h-3 w-3" /> Hoje
      </p>
    );
  }

  if (status === "week") {
    return (
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#0b8f45]">
        <Sparkles className="h-3 w-3" /> Esta semana
      </p>
    );
  }

  return (
    <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400">
      Restante do mês
    </p>
  );
}

function BirthdayGroupBlock({
  group,
  compact,
  measure = false,
}: {
  group: BirthdayGroup;
  compact: boolean;
  measure?: boolean;
}) {
  return (
    <div data-birthday-group={measure ? group.status : undefined}>
      <BirthdayGroupHeading status={group.status} />
      <div className="space-y-1.5">
        {group.items.map((item) => (
          <BirthdayRow
            key={item.memberId}
            item={item}
            compact={compact}
            dataBirthdayId={measure ? item.memberId : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function birthdayPageKey(page: BirthdayPage) {
  return page.groups
    .flatMap((group) => group.items.map((item) => item.memberId))
    .join("|");
}

function groupCost(metric: BirthdayGroupMetrics, itemCount: number) {
  if (!itemCount) return 0;
  return (
    metric.overhead +
    metric.rowHeights.slice(0, itemCount).reduce((sum, height) => sum + height, 0) +
    metric.rowGap * Math.max(0, itemCount - 1)
  );
}

function paginateBirthdayGroups(
  groups: BirthdayGroup[],
  metrics: BirthdayGroupMetrics[],
  viewportHeight: number,
  groupGap: number,
) {
  const pages: BirthdayPage[] = [];
  let currentGroups: BirthdayGroup[] = [];
  let currentHeight = 0;

  const pushPage = () => {
    if (currentGroups.length) pages.push({ groups: currentGroups });
    currentGroups = [];
    currentHeight = 0;
  };

  groups.forEach((group, groupIndex) => {
    const metric = metrics[groupIndex];
    let itemOffset = 0;

    while (itemOffset < group.items.length) {
      const remaining = group.items.length - itemOffset;
      const prefixMetric = {
        ...metric,
        rowHeights: metric.rowHeights.slice(itemOffset),
      };
      const available = Math.max(
        1,
        viewportHeight - currentHeight - (currentGroups.length ? groupGap : 0),
      );
      let itemCount = 0;

      for (let candidate = 1; candidate <= remaining; candidate += 1) {
        if (groupCost(prefixMetric, candidate) <= available) itemCount = candidate;
        else break;
      }

      if (!itemCount) {
        if (currentGroups.length) {
          pushPage();
          continue;
        }
        itemCount = 1;
      }

      const pageGroup = {
        ...group,
        items: group.items.slice(itemOffset, itemOffset + itemCount),
      };
      currentGroups.push(pageGroup);
      currentHeight +=
        groupCost(prefixMetric, itemCount) +
        (currentGroups.length > 1 ? groupGap : 0);
      itemOffset += itemCount;

      if (itemOffset < group.items.length) pushPage();
    }
  });

  pushPage();
  return pages;
}

function BirthdayMonthPanel({
  month,
  compact,
  fill,
  active,
}: {
  month: TVBirthdayMonth;
  compact: boolean;
  fill: boolean;
  active: boolean;
}) {
  const { birthdays } = month;
  const groups = useMemo<BirthdayGroup[]>(
    () =>
      (["today", "week", "month"] as const)
        .map((status) => ({
          status,
          items: birthdays.filter((item) => item.status === status),
        }))
        .filter((group) => group.items.length > 0),
    [birthdays],
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<BirthdayPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const pagesRef = useRef<BirthdayPage[]>([]);
  const pageIndexRef = useRef(0);
  const previousPagesRef = useRef<BirthdayPage[]>([]);
  const pauseTimerRef = useRef<number | null>(null);
  const pausedUntilRef = useRef(0);
  const pointerStartXRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    const measure = measureRef.current;
    if (!list || !measure) return;
    if (!groups.length) {
      pagesRef.current = [];
      pageIndexRef.current = 0;
      previousPagesRef.current = [];
      return;
    }

    let frame = 0;
    const measurePages = () => {
      const viewportHeight = list.clientHeight;
      if (!viewportHeight) return;
      measure.style.width = `${list.clientWidth}px`;
      const groupElements = Array.from(
        measure.querySelectorAll<HTMLElement>("[data-birthday-group]"),
      );
      const metrics = groupElements.map((groupElement, groupIndex) => {
        const rows = Array.from(
          groupElement.querySelectorAll<HTMLElement>("[data-birthday-id]"),
        );
        const rowHeights = rows.map((row) => row.getBoundingClientRect().height);
        const rowGap = rows.length > 1
          ? Math.max(
              0,
              rows[1].getBoundingClientRect().top -
                rows[0].getBoundingClientRect().bottom,
            )
          : 0;
        const groupHeight = groupElement.getBoundingClientRect().height;
        const overhead = Math.max(
          0,
          groupHeight -
            rowHeights.reduce((sum, height) => sum + height, 0) -
            rowGap * Math.max(0, rowHeights.length - 1),
        );
        return {
          status: groups[groupIndex].status,
          rowHeights,
          rowGap,
          overhead,
        };
      });
      const groupGap = groupElements.length > 1
        ? Math.max(
            0,
            groupElements[1].getBoundingClientRect().top -
              groupElements[0].getBoundingClientRect().bottom,
          )
        : 0;
      setPages(paginateBirthdayGroups(groups, metrics, viewportHeight, groupGap));
    };

    frame = window.requestAnimationFrame(measurePages);
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          window.cancelAnimationFrame(frame);
          frame = window.requestAnimationFrame(measurePages);
        });
    observer?.observe(list);
    observer?.observe(measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [compact, fill, groups]);

  useEffect(() => {
    pagesRef.current = pages;
    const previousPage = previousPagesRef.current[pageIndexRef.current];
    const previousKey = previousPage ? birthdayPageKey(previousPage) : null;
    const matchingIndex = previousKey
      ? pages.findIndex((page) => birthdayPageKey(page) === previousKey)
      : -1;
    const nextIndex = matchingIndex >= 0
      ? matchingIndex
      : Math.min(pageIndexRef.current, Math.max(0, pages.length - 1));
    pageIndexRef.current = nextIndex;
    setPageIndex((current) => (current === nextIndex ? current : nextIndex));
    previousPagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      const count = pagesRef.current.length;
      if (count < 2) return;
      setPageIndex((current) => {
        const next = (current + 1) % count;
        pageIndexRef.current = next;
        return next;
      });
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [active]);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current !== null) window.clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const pauseForInteraction = useCallback(() => {
    pausedUntilRef.current = Date.now() + 10_000;
    setPaused(true);
    if (pauseTimerRef.current !== null) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(() => {
      pausedUntilRef.current = 0;
      setPaused(false);
    }, 10_000);
  }, []);

  const movePage = useCallback(
    (direction: -1 | 1) => {
      pauseForInteraction();
      const count = pagesRef.current.length;
      if (count < 2) return;
      setPageIndex((current) => {
        const next = (current + direction + count) % count;
        pageIndexRef.current = next;
        return next;
      });
    },
    [pauseForInteraction],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      movePage(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      movePage(-1);
    }
  };

  const visibleGroups = groups.length ? pages[pageIndex]?.groups ?? groups : [];
  const visiblePageKey = pages[pageIndex]
    ? birthdayPageKey(pages[pageIndex])
    : "birthday-page-pending";

  return (
    <div className={`relative flex min-h-0 min-w-0 flex-col ${fill ? "h-full" : ""}`}>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex shrink-0 items-center justify-center rounded-xl bg-[#003b71] text-[#b8ee35] ${compact ? "h-8 w-8" : "h-9 w-9"}`}>
            <Cake className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </span>
          <div className="min-w-0">
            <h2 className={`${compact ? "text-sm" : "text-base"} truncate font-bold text-[#003b71]`}>
              Aniversariantes de {monthName(month.month).toLowerCase()}
            </h2>
            <p className="truncate text-[10px] text-slate-500">{monthLabel(month)}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-[#b8ee35]/60 px-2 py-1 text-[10px] font-bold text-[#003b71]">
          {birthdays.length}
        </span>
      </div>

      <div ref={measureRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 opacity-0">
        <div className="space-y-2 pr-1">
          {groups.map((group) => (
            <BirthdayGroupBlock key={`measure-${group.status}`} group={group} compact={compact} measure />
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        tabIndex={active ? 0 : -1}
        aria-label="Navegação dos aniversariantes"
        aria-live={active ? "polite" : "off"}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.focus();
          pauseForInteraction();
          pointerStartXRef.current = event.clientX;
        }}
        onPointerUp={(event) => {
          const startX = pointerStartXRef.current;
          pointerStartXRef.current = null;
          if (startX === null) return;
          const delta = event.clientX - startX;
          if (Math.abs(delta) >= 24) movePage(delta < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          pointerStartXRef.current = null;
        }}
        className={`relative mt-3 min-h-0 touch-pan-y ${fill ? "flex-1 overflow-y-auto" : "overflow-y-auto"} pr-1 focus:outline-none focus:ring-2 focus:ring-[#b8ee35] ${compact ? "max-h-[min(48vh,440px)]" : "max-h-[min(52vh,500px)]"}`}
      >
        {groups.length ? (
          <div key={visiblePageKey} className="tv-birthday-page space-y-2">
            {visibleGroups.map((group) => (
              <BirthdayGroupBlock key={group.status} group={group} compact={compact} />
            ))}
          </div>
        ) : (
          <div className={`flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-xs text-slate-400 ${fill ? "h-full" : ""}`}>
            Nenhum aniversariante em {monthName(month.month).toLowerCase()}.
          </div>
        )}
        {paused && pages.length > 1 ? (
          <span className="sr-only">Rotação pausada após interação manual</span>
        ) : null}
      </div>
    </div>
  );
}

function BirthdaySidebar({
  birthdayMonths,
  compact,
  fill = false,
}: {
  birthdayMonths: TVBirthdayMonths;
  compact: boolean;
  fill?: boolean;
}) {
  const months = [birthdayMonths.current, birthdayMonths.next];
  const [monthIndex, setMonthIndex] = useState(0);
  const activeMonthIndex = Math.min(monthIndex, months.length - 1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMonthIndex((current) => (current + 1) % months.length);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [months.length]);

  return (
    <section className={`relative flex min-h-0 flex-col rounded-2xl border border-[#003b71]/10 bg-white shadow-lg ${fill ? "h-full" : ""} ${compact ? "p-3" : "p-4"}`}>
      <div className={`relative min-h-0 overflow-hidden ${fill ? "flex-1" : ""}`}>
        <div
          className="flex h-full min-h-0 w-[200%] transition-transform duration-700 ease-in-out motion-reduce:transition-none"
          style={{ transform: `translate3d(-${activeMonthIndex * 50}%, 0, 0)` }}
        >
          {months.map((month, index) => (
            <div
              key={`${month.year}-${month.month}-${index}`}
              aria-hidden={index !== activeMonthIndex}
              className="h-full w-1/2 shrink-0 min-w-0"
            >
              <BirthdayMonthPanel
                month={month}
                compact={compact}
                fill={fill}
                active={index === activeMonthIndex}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExpandedBirthdayPanel({ birthdayMonths }: { birthdayMonths: TVBirthdayMonths }) {
  return <BirthdaySidebar birthdayMonths={birthdayMonths} compact={false} />;
}

export function BirthdayHighlights({
  birthdays,
  birthdayMonths,
  compact = false,
  sidebar = false,
  fill = false,
}: {
  birthdays: TVBirthday[];
  birthdayMonths?: TVBirthdayMonths;
  compact?: boolean;
  sidebar?: boolean;
  fill?: boolean;
}) {
  const resolvedBirthdayMonths = useMemo(
    () => birthdayMonths ?? (birthdays.length ? fallbackBirthdayMonths(birthdays) : null),
    [birthdayMonths, birthdays],
  );
  if (!resolvedBirthdayMonths) return null;
  if (sidebar) {
    if (!compact) return <BirthdaySidebar birthdayMonths={resolvedBirthdayMonths} compact={false} />;
    return (
      <>
        <div className="hidden h-full min-h-0 flex-col xl:flex">
          <BirthdaySidebar birthdayMonths={resolvedBirthdayMonths} compact fill={fill} />
        </div>
        <div className="xl:hidden">
          <CompactBirthdayStrip birthdays={resolvedBirthdayMonths.current.birthdays} />
        </div>
      </>
    );
  }
  if (compact) return <CompactBirthdayStrip birthdays={resolvedBirthdayMonths.current.birthdays} />;
  return <ExpandedBirthdayPanel birthdayMonths={resolvedBirthdayMonths} />;
}

export function UnitBirthdayBadge({ members, compact = false }: { members: UnitMember[]; compact?: boolean }) {
  const today = members.filter((member) => member.birthday?.status === "today");
  const week = members.filter((member) => member.birthday?.status === "week");
  if (!today.length && !week.length) return null;
  const isToday = today.length > 0;
  const people = isToday ? today : week;
  return (
    <div className={`${compact ? "mt-1 rounded-xl px-2 py-1" : "mt-3 rounded-2xl px-3 py-2.5"} border ${isToday ? "border-[#f09a7d]/60 bg-[#fff1e9] text-[#7f2d1d]" : "border-[#b8ee35]/60 bg-[#f4fbe2] text-[#164b2b]"}`}>
      <p className={`${compact ? "text-[9px]" : "text-xs"} flex items-center gap-1.5 font-extrabold uppercase tracking-[.12em]`}>
        {isToday ? <Gift className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        {isToday ? "Feliz aniversário!" : "Aniversariante da semana"}
      </p>
      <p className={`${compact ? "text-[10px]" : "text-sm"} mt-0.5 truncate font-bold`}>
        {people.map((member) => member.name).join(", ")}
      </p>
    </div>
  );
}
