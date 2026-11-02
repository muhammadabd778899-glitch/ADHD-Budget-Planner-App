import type {
  DateOnly,
  IncomeSource,
  PlannedPayday,
  PlanMode,
  ProjectedPayday,
} from '@/domain/types';
import {
  addDays,
  addMonthsClamped,
  endOfMonth,
  isInRange,
  startOfMonth,
  todayISO,
} from '@/lib/dates';
import { occurrenceDatesInRange } from '@/lib/recurrence';

export interface PlanWindow {
  start: DateOnly;
  end: DateOnly;
  nextPayday: DateOnly | null;
  mode: PlanMode;
  label: string;
  days: number;
}

export function projectPaydays(
  sources: IncomeSource[],
  from: DateOnly,
  to: DateOnly,
): ProjectedPayday[] {
  const rows: ProjectedPayday[] = [];
  for (const source of sources) {
    if (!source.active) continue;
    if (source.frequency === 'irregular') continue;
    const end = source.endDate && source.endDate < to ? source.endDate : to;
    if (end < from) continue;
    const dates = occurrenceDatesInRange(
      { frequency: source.frequency, anchorDate: source.anchorDate, endDate: source.endDate },
      from,
      to,
    );
    for (const date of dates) {
      if (source.frequency === 'one-time' && date !== source.anchorDate) continue;
      rows.push({
        date,
        sourceId: source.id,
        sourceName: source.name,
        amountMinor: source.amountMinor,
      });
    }
  }
  return rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.sourceName.localeCompare(b.sourceName),
  );
}

export function groupPaydaysByDate(rows: ProjectedPayday[]): PlannedPayday[] {
  const map = new Map<DateOnly, ProjectedPayday[]>();
  for (const row of rows) {
    const list = map.get(row.date) ?? [];
    list.push(row);
    map.set(row.date, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entries]) => ({
      date,
      entries,
      totalMinor: entries.reduce((total, entry) => total + entry.amountMinor, 0),
    }));
}

export function nextPayday(
  sources: IncomeSource[],
  today: DateOnly,
): { date: DateOnly; totalMinor: number; entries: ProjectedPayday[] } | null {
  const horizon = addMonthsClamped(today, 24);
  const rows = projectPaydays(sources, addDays(today, 1), horizon);
  const next = rows[0];
  if (!next) return null;
  const sameDay = rows.filter((row) => row.date === next.date);
  return {
    date: next.date,
    entries: sameDay,
    totalMinor: sameDay.reduce((total, row) => total + row.amountMinor, 0),
  };
}

export function expectedIncomeBetween(
  sources: IncomeSource[],
  from: DateOnly,
  to: DateOnly,
): number {
  return projectPaydays(sources, from, to).reduce((total, row) => total + row.amountMinor, 0);
}

export function getPlanWindow(
  mode: PlanMode,
  today: DateOnly,
  sources: IncomeSource[],
): PlanWindow {
  if (mode === 'month') {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return {
      start,
      end,
      nextPayday: nextPayday(sources, today)?.date ?? null,
      mode,
      label: 'This month',
      days: Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1),
    };
  }

  const next = nextPayday(sources, today);
  if (next) {
    const end = addDays(next.date, -1);
    return {
      start: today,
      end: end < today ? today : end,
      nextPayday: next.date,
      mode,
      label: 'Until next payday',
      days: Math.max(1, Math.round((Date.parse(end) - Date.parse(today)) / 86_400_000) + 1),
    };
  }

  const end = endOfMonth(today);
  return {
    start: today,
    end,
    nextPayday: null,
    mode,
    label: 'Until month end',
    days: Math.max(1, Math.round((Date.parse(end) - Date.parse(today)) / 86_400_000) + 1),
  };
}

export function paydaysInMonth(sources: IncomeSource[], month: DateOnly): ProjectedPayday[] {
  return projectPaydays(sources, startOfMonth(month), endOfMonth(month));
}

export function isDateInPlanWindow(date: DateOnly, window: PlanWindow): boolean {
  return isInRange(date, window.start, window.end);
}

export function samplePlanWindow(mode: PlanMode, sources: IncomeSource[]): PlanWindow {
  return getPlanWindow(mode, todayISO(), sources);
}
