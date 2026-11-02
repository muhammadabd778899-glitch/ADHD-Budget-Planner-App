import type { DateFormat, DateOnly } from '@/domain/types';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;
  const date = parseDateOnly(value);
  return !Number.isNaN(date.getTime()) && toDateOnly(date) === value;
}

export function parseDateOnly(value: DateOnly): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateOnly(date: Date): DateOnly {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(now = new Date()): DateOnly {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(value: DateOnly, days: number): DateOnly {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

export function addMonthsClamped(value: DateOnly, months: number): DateOnly {
  const date = parseDateOnly(value);
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toDateOnly(target);
}

export function addYearsClamped(value: DateOnly, years: number): DateOnly {
  return addMonthsClamped(value, years * 12);
}

export function startOfMonth(value: DateOnly): DateOnly {
  const date = parseDateOnly(value);
  return toDateOnly(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
}

export function endOfMonth(value: DateOnly): DateOnly {
  const date = parseDateOnly(value);
  return toDateOnly(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

export function monthKey(value: DateOnly): string {
  return value.slice(0, 7);
}

export function daysBetween(from: DateOnly, to: DateOnly): number {
  return Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000);
}

export function compareDates(a: DateOnly, b: DateOnly): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function isBefore(a: DateOnly, b: DateOnly): boolean {
  return a < b;
}

export function isAfter(a: DateOnly, b: DateOnly): boolean {
  return a > b;
}

export function isSameOrBefore(a: DateOnly, b: DateOnly): boolean {
  return a <= b;
}

export function isSameOrAfter(a: DateOnly, b: DateOnly): boolean {
  return a >= b;
}

export function isInRange(value: DateOnly, from: DateOnly, to: DateOnly): boolean {
  return value >= from && value <= to;
}

export function eachDay(from: DateOnly, to: DateOnly): DateOnly[] {
  const days: DateOnly[] = [];
  if (from > to) return days;
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 10_000) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

export function formatDateOnly(
  value: DateOnly,
  locale = 'en-US',
  format: DateFormat = 'medium',
): string {
  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { month: 'numeric', day: 'numeric', year: 'numeric' }
      : format === 'long'
        ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(
    parseDateOnly(value),
  );
}

export function formatDateShort(value: DateOnly, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parseDateOnly(value));
}

export function formatWeekday(value: DateOnly, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
    parseDateOnly(value),
  );
}

export function formatMonth(value: DateOnly, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDateOnly(value));
}

export function relativeDayLabel(value: DateOnly, today: DateOnly, locale = 'en-US'): string {
  const diff = daysBetween(today, value);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff <= 6) return formatWeekday(value, locale);
  return formatDateShort(value, locale);
}

export function dueTone(value: DateOnly, today: DateOnly): 'overdue' | 'today' | 'soon' | 'later' {
  const diff = daysBetween(today, value);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'soon';
  return 'later';
}

export function monthRange(month: DateOnly): { start: DateOnly; end: DateOnly } {
  return { start: startOfMonth(month), end: endOfMonth(month) };
}
