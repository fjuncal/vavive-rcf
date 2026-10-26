import { z } from "zod";
import { civilDateToUTCDate, getTodayCivilDate, isValidCivilDate } from "@/lib/utils";

export const BIRTHDAY_TIME_ZONE = "America/Sao_Paulo";

export type BirthdayStatus = "today" | "week" | "month";

export type BirthdayCandidate = {
  memberId: string;
  memberName: string;
  photoUrl: string | null;
  birthDate: Date | string | null;
  franchiseeId: string;
  unitName: string;
};

export type BirthdayHighlight = {
  memberId: string;
  memberName: string;
  photoUrl: string | null;
  franchiseeId: string;
  unitName: string;
  day: number;
  month: number;
  status: BirthdayStatus;
};

export type BirthdayMonthHighlights = {
  year: number;
  month: number;
  birthdays: BirthdayHighlight[];
};

export type BirthdayMonthWindow = {
  current: BirthdayMonthHighlights;
  next: BirthdayMonthHighlights;
};

const BIRTH_DATE_MESSAGE = "A data de nascimento deve ser válida e não pode ser futura.";

/** Shared API validation. Empty string clears birthday. */
export const birthDateSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z
    .string(BIRTH_DATE_MESSAGE)
    .refine(isValidCivilDate, { message: BIRTH_DATE_MESSAGE })
    .refine((value) => value <= getTodayCivilDate(), {
      message: "A data de nascimento não pode ser futura.",
    })
    .nullable()
    .optional(),
);

export function birthDateToUTCDate(value: string | null | undefined) {
  return value ? civilDateToUTCDate(value) : null;
}

type CivilParts = { year: number; month: number; day: number };

function civilParts(value: Date | string | null | undefined): CivilParts | null {
  if (!value) return null;
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
    if (match) {
      return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
      };
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function observedBirthday(birth: CivilParts, year: number): CivilParts {
  return {
    year,
    month: birth.month,
    day: birth.month === 2 && birth.day === 29 && !isLeapYear(year) ? 28 : birth.day,
  };
}

function toDayNumber(value: CivilParts) {
  return Math.floor(Date.UTC(value.year, value.month - 1, value.day) / 86_400_000);
}

function weekRange(reference: CivilParts) {
  const referenceDate = new Date(Date.UTC(reference.year, reference.month - 1, reference.day));
  const mondayOffset = (referenceDate.getUTCDay() + 6) % 7;
  const monday = new Date(referenceDate);
  monday.setUTCDate(monday.getUTCDate() - mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return {
    start: toDayNumber({ year: monday.getUTCFullYear(), month: monday.getUTCMonth() + 1, day: monday.getUTCDate() }),
    end: toDayNumber({ year: sunday.getUTCFullYear(), month: sunday.getUTCMonth() + 1, day: sunday.getUTCDate() }),
  };
}

/** Classifies one birthday using America/Sao_Paulo civil date. */
export function classifyBirthday(
  birthDate: Date | string | null | undefined,
  referenceDate = getTodayCivilDate(),
): BirthdayStatus | null {
  const birth = civilParts(birthDate);
  const reference = civilParts(referenceDate);
  if (!birth || !reference) return null;

  const todayNumber = toDayNumber(reference);
  const week = weekRange(reference);
  const observedDates = [reference.year - 1, reference.year, reference.year + 1].map(
    (year) => observedBirthday(birth, year),
  );
  if (observedDates.some((date) => toDayNumber(date) === todayNumber)) return "today";
  if (
    observedDates.some((date) => {
      const day = toDayNumber(date);
      return day >= week.start && day <= week.end;
    })
  ) {
    return "week";
  }
  const observed = observedBirthday(birth, reference.year);
  if (observed.month === reference.month) return "month";
  return null;
}

export function birthdayMatchesMonthDay(
  birthDate: Date | string | null | undefined,
  month: number,
  day: number | null = null,
) {
  const birth = civilParts(birthDate);
  return Boolean(
    birth && birth.month === month && (day === null || birth.day === day),
  );
}

/** Returns one ordered, non-duplicated visual composition for TV. */
export function getBirthdayHighlights(
  candidates: BirthdayCandidate[],
  referenceDate = getTodayCivilDate(),
): BirthdayHighlight[] {
  const reference = civilParts(referenceDate);
  if (!reference) return [];
  const seen = new Set<string>();
  const highlights = candidates.flatMap((candidate) => {
    if (seen.has(candidate.memberId)) return [];
    const status = classifyBirthday(candidate.birthDate, referenceDate);
    if (!status) return [];
    const birth = civilParts(candidate.birthDate);
    if (!birth) return [];
    const observed = observedBirthday(birth, reference.year);
    const belongsToCurrentMonth = observed.month === reference.month;
    if (status !== "today" && status !== "week" && !belongsToCurrentMonth) return [];
    seen.add(candidate.memberId);
    return [{
      memberId: candidate.memberId,
      memberName: candidate.memberName,
      photoUrl: candidate.photoUrl,
      franchiseeId: candidate.franchiseeId,
      unitName: candidate.unitName,
      day: observed.day,
      month: observed.month,
      status,
    }];
  });

  const rank: Record<BirthdayStatus, number> = { today: 0, week: 1, month: 2 };
  return highlights.sort(
    (left, right) =>
      rank[left.status] - rank[right.status] ||
      left.day - right.day ||
      left.memberName.localeCompare(right.memberName, "pt-BR"),
  );
}

/** Returns strict current and next calendar-month compositions for TV. */
export function getBirthdayMonthWindow(
  candidates: BirthdayCandidate[],
  referenceDate = getTodayCivilDate(),
): BirthdayMonthWindow {
  const reference = civilParts(referenceDate);
  if (!reference) {
    return {
      current: { year: 0, month: 0, birthdays: [] },
      next: { year: 0, month: 0, birthdays: [] },
    };
  }

  const nextMonth = new Date(Date.UTC(reference.year, reference.month, 1));
  const current = {
    year: reference.year,
    month: reference.month,
  };
  const next = {
    year: nextMonth.getUTCFullYear(),
    month: nextMonth.getUTCMonth() + 1,
  };

  return {
    current: {
      ...current,
      birthdays: getBirthdayHighlightsForMonth(
        candidates,
        current.year,
        current.month,
        referenceDate,
      ),
    },
    next: {
      ...next,
      birthdays: getBirthdayHighlightsForMonth(
        candidates,
        next.year,
        next.month,
        referenceDate,
      ),
    },
  };
}

/** Returns only birthdays observed inside requested calendar month. */
export function getBirthdayHighlightsForMonth(
  candidates: BirthdayCandidate[],
  year: number,
  month: number,
  referenceDate = getTodayCivilDate(),
): BirthdayHighlight[] {
  const reference = civilParts(referenceDate);
  if (!reference || year < 1 || month < 1 || month > 12) return [];

  const isCurrentMonth = reference.year === year && reference.month === month;
  const seen = new Set<string>();
  const highlights = candidates.flatMap((candidate) => {
    if (seen.has(candidate.memberId)) return [];
    const birth = civilParts(candidate.birthDate);
    if (!birth) return [];
    const observed = observedBirthday(birth, year);
    if (observed.month !== month) return [];

    const status = isCurrentMonth
      ? classifyBirthday(candidate.birthDate, referenceDate)
      : "month";
    if (!status) return [];

    seen.add(candidate.memberId);
    return [{
      memberId: candidate.memberId,
      memberName: candidate.memberName,
      photoUrl: candidate.photoUrl,
      franchiseeId: candidate.franchiseeId,
      unitName: candidate.unitName,
      day: observed.day,
      month: observed.month,
      status,
    }];
  });

  const rank: Record<BirthdayStatus, number> = { today: 0, week: 1, month: 2 };
  return highlights.sort(
    (left, right) =>
      rank[left.status] - rank[right.status] ||
      left.day - right.day ||
      left.memberName.localeCompare(right.memberName, "pt-BR"),
  );
}

