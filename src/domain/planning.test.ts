import { describe, expect, it } from 'vitest';
import {
  expectedIncomeBetween,
  getPlanWindow,
  groupPaydaysByDate,
  nextPayday,
  projectPaydays,
} from '@/domain/planning';
import { makeIncomeSource } from '@/test/fixtures';

describe('planning window', () => {
  const paycheck = makeIncomeSource({
    id: 'inc-main',
    name: 'Main paycheck',
    amountMinor: 200_000,
    frequency: 'biweekly',
    anchorDate: '2026-03-13',
  });

  it('runs until the day before the next projected payday', () => {
    const window = getPlanWindow('paycheck', '2026-03-10', [paycheck]);

    expect(window).toMatchObject({
      start: '2026-03-10',
      end: '2026-03-12',
      nextPayday: '2026-03-13',
      mode: 'paycheck',
      label: 'Until next payday',
      days: 3,
    });
  });

  it('uses the full calendar month in month mode', () => {
    const window = getPlanWindow('month', '2026-03-10', [paycheck]);

    expect(window).toMatchObject({
      start: '2026-03-01',
      end: '2026-03-31',
      mode: 'month',
      label: 'This month',
      days: 31,
    });
  });

  it('falls back to month end when there is no active schedule', () => {
    const window = getPlanWindow('paycheck', '2026-03-10', [makeIncomeSource({ active: false })]);

    expect(window).toMatchObject({
      start: '2026-03-10',
      end: '2026-03-31',
      nextPayday: null,
      label: 'Until month end',
    });
  });
});

describe('projectPaydays', () => {
  it('projects active scheduled sources and skips paused or irregular ones', () => {
    const rows = projectPaydays(
      [
        makeIncomeSource({ id: 'inc-a', name: 'A', anchorDate: '2026-03-13' }),
        makeIncomeSource({ id: 'inc-b', name: 'B', anchorDate: '2026-03-13', active: false }),
        makeIncomeSource({ id: 'inc-c', name: 'C', frequency: 'irregular' }),
        makeIncomeSource({
          id: 'inc-d',
          name: 'D',
          frequency: 'one-time',
          anchorDate: '2026-03-20',
          amountMinor: 5000,
        }),
      ],
      '2026-03-01',
      '2026-03-31',
    );

    expect(rows.map((row) => `${row.sourceName}:${row.date}`)).toEqual([
      'A:2026-03-13',
      'D:2026-03-20',
      'A:2026-03-27',
    ]);
    expect(rows.every((row) => row.amountMinor > 0)).toBe(true);
  });

  it('groups several sources landing on one date', () => {
    const rows = projectPaydays(
      [
        makeIncomeSource({ id: 'inc-a', name: 'A', amountMinor: 1000 }),
        makeIncomeSource({ id: 'inc-b', name: 'B', amountMinor: 2500 }),
      ],
      '2026-03-01',
      '2026-03-31',
    );
    const grouped = groupPaydaysByDate(rows);

    expect(grouped[0]).toMatchObject({
      date: '2026-03-13',
      totalMinor: 3500,
    });
    expect(grouped[0]?.entries).toHaveLength(2);
  });

  it('finds the next payday total and expected income between dates', () => {
    const sources = [
      makeIncomeSource({ id: 'inc-a', name: 'A', anchorDate: '2026-03-13', amountMinor: 1000 }),
      makeIncomeSource({ id: 'inc-b', name: 'B', anchorDate: '2026-03-13', amountMinor: 2500 }),
    ];

    expect(nextPayday(sources, '2026-03-10')).toMatchObject({
      date: '2026-03-13',
      totalMinor: 3500,
    });
    expect(expectedIncomeBetween(sources, '2026-03-01', '2026-03-31')).toBe(7000);
  });
});
