import { describe, expect, it } from 'vitest';
import { addDays, addMonthsClamped, isWeekend, monthKey } from './dates';

describe('isWeekend', () => {
  it('flags Saturday and Sunday', () => {
    expect(isWeekend('2026-11-07')).toBe(true);
    expect(isWeekend('2026-11-08')).toBe(true);
  });

  it('does not flag weekdays', () => {
    expect(isWeekend('2026-11-05')).toBe(false);
    expect(isWeekend('2026-11-09')).toBe(false);
    expect(isWeekend('2026-11-13')).toBe(false);
  });
});

describe('date arithmetic helpers', () => {
  it('clamps month additions to the last valid day', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(monthKey(addDays('2026-01-31', 1))).toBe('2026-02');
  });
});
