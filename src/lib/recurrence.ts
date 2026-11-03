import type { BillFrequency, DateOnly, IncomeFrequency } from '@/domain/types';
import {
  addDays,
  addMonthsClamped,
  addYearsClamped,
  compareDates,
  daysBetween,
  isValidDateOnly,
} from '@/lib/dates';

export type RecurrenceFrequency = IncomeFrequency | BillFrequency;

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  anchorDate: DateOnly;
  endDate?: DateOnly | null;
  secondDay?: number | null;
}

const MAX_OCCURRENCES = 20_000;

interface MonthCursor {
  year: number;
  month: number;
}

function parseParts(value: DateOnly): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function makeDate(year: number, monthIndex: number, day: number): DateOnly {
  const safeDay = Math.min(day, daysInMonth(year, monthIndex));
  const month = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${month}-${String(safeDay).padStart(2, '0')}`;
}

function nextMonth(cursor: MonthCursor, step: number): MonthCursor {
  const zeroBased = cursor.year * 12 + cursor.month + step;
  return { year: Math.floor(zeroBased / 12), month: ((zeroBased % 12) + 12) % 12 };
}

function validRule(rule: RecurrenceRule): boolean {
  if (!isValidDateOnly(rule.anchorDate)) return false;
  if (rule.endDate !== null && rule.endDate !== undefined && !isValidDateOnly(rule.endDate)) {
    return false;
  }
  return true;
}

/**
 * Returns every occurrence date in the inclusive [from, to] window.
 * Monthly/quarterly/yearly rules keep the anchor day where possible and clamp
 * to the last day of shorter months. Semimonthly uses the 1st and the
 * configured second day (the 15th when none is given).
 */
export function occurrenceDatesInRange(
  rule: RecurrenceRule,
  from: DateOnly,
  to: DateOnly,
): DateOnly[] {
  if (!validRule(rule) || from > to) return [];
  const end = rule.endDate ?? null;
  const effectiveTo = end && end < to ? end : to;
  if (effectiveTo < from) return [];

  const anchor = rule.anchorDate;
  const results: DateOnly[] = [];
  const push = (date: DateOnly) => {
    if (date < anchor) return;
    if (end && date > end) return;
    if (date < from || date > effectiveTo) return;
    if (results.length === 0 || results[results.length - 1] !== date) results.push(date);
  };

  switch (rule.frequency) {
    case 'one-time': {
      push(anchor);
      break;
    }
    case 'irregular': {
      break;
    }
    case 'weekly':
    case 'biweekly': {
      const step = rule.frequency === 'weekly' ? 7 : 14;
      if (from > anchor) {
        const gap = daysBetween(anchor, from);
        const skips = Math.floor(gap / step);
        let cursor = addDays(anchor, skips * step);
        while (cursor < from) cursor = addDays(cursor, step);
        for (let i = 0; cursor <= effectiveTo && i < MAX_OCCURRENCES; i += 1) {
          push(cursor);
          cursor = addDays(cursor, step);
        }
      } else {
        let cursor = anchor;
        for (let i = 0; cursor <= effectiveTo && i < MAX_OCCURRENCES; i += 1) {
          push(cursor);
          cursor = addDays(cursor, step);
        }
      }
      break;
    }
    case 'semimonthly': {
      const anchorParts = parseParts(anchor);
      const secondDay =
        rule.secondDay && rule.secondDay >= 2 && rule.secondDay <= 31 ? rule.secondDay : 15;
      let cursor: MonthCursor = { year: anchorParts.year, month: anchorParts.month - 1 };
      for (let i = 0; i < 1200; i += 1) {
        const monthDates = [
          makeDate(cursor.year, cursor.month, 1),
          makeDate(cursor.year, cursor.month, secondDay),
        ];
        for (const date of monthDates) push(date);
        if (compareDates(monthDates[1] ?? monthDates[0]!, effectiveTo) >= 0) break;
        cursor = nextMonth(cursor, 1);
      }
      break;
    }
    case 'monthly':
    case 'quarterly':
    case 'yearly': {
      const step = rule.frequency === 'monthly' ? 1 : rule.frequency === 'quarterly' ? 3 : 12;
      for (let i = 0; i < 1200; i += 1) {
        const date =
          rule.frequency === 'yearly'
            ? addYearsClamped(anchor, i)
            : addMonthsClamped(anchor, i * step);
        if (date > effectiveTo) break;
        push(date);
      }
      break;
    }
  }

  return [...new Set(results)].sort();
}

export function occurrenceDates(rule: RecurrenceRule, count: number): DateOnly[] {
  if (count <= 0) return [];
  const windowEnd = addYearsClamped(rule.anchorDate, 30);
  return occurrenceDatesInRange(rule, rule.anchorDate, windowEnd).slice(0, count);
}

export function isOccurrenceDate(rule: RecurrenceRule, date: DateOnly): boolean {
  return occurrenceDatesInRange(rule, date, date).length === 1;
}

export function nextOccurrence(rule: RecurrenceRule, after: DateOnly): DateOnly | null {
  const windowEnd = addYearsClamped(after, 30);
  const dates = occurrenceDatesInRange(rule, addDays(after, 1), windowEnd);
  return dates[0] ?? null;
}

export function previousOccurrence(rule: RecurrenceRule, before: DateOnly): DateOnly | null {
  const windowStart = addYearsClamped(before, -30);
  const dates = occurrenceDatesInRange(rule, windowStart, addDays(before, -1));
  return dates[dates.length - 1] ?? null;
}
