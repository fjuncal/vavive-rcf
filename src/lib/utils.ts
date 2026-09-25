import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function formatDateTime(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function getMonthRange(monthDate: Date) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

// ---------------------------------------------------------------------------
// Datas civis (@db.Date, sem hora/timezone).
// Tudo em UTC para que 10/06/2024 nunca vire 09/06 ou 11/06 por fuso local.
// ---------------------------------------------------------------------------

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUTCDate(value: Date | string): Date | null {
  const date = typeof value === "string" ? new Date(value) : value;
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

/** "2024-06-10" (ou Date) → "2024-06-10" para <input type="date">. */
export function toDateInputValue(
  value: Date | string | null | undefined,
): string {
  const date = value ? toUTCDate(value) : null;
  if (!date) return "";
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

/** "2024-06-10" (ou Date) → "10/06/2024" para exibição. */
export function formatCivilDate(
  value: Date | string | null | undefined,
): string {
  const date = value ? toUTCDate(value) : null;
  if (!date) return "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

/** Valida "YYYY-MM-DD" como data civil real (rejeita 2024-13-40, 2024-02-30). */
export function isValidCivilDate(value: string): boolean {
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** "2024-06-10" → Date em meia-noite UTC (compatível com @db.Date). */
export function civilDateToUTCDate(value: string): Date {
  const match = CIVIL_DATE_PATTERN.exec(value) as RegExpExecArray;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}
