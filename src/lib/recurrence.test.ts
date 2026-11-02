import { describe, expect, it } from 'vitest';
import {
  isOccurrenceDate,
  nextOccurrence,
  occurrenceDatesInRange,
  previousOccurrence,
} from '@/lib/recurrence';

describe('occurrenceDatesInRange', () => {
  it('clamps monthly dates to the last valid day of shorter months', () => {
    const dates = occurrenceDatesInRange(
      { frequency: 'monthly', anchorDate: '2026-01-31' },
      '2026-01-01',
      '2026-04-30',
    );

    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('supports a leap year when clamping January 31', () => {
    const dates = occurrenceDatesInRange(
      { frequency: 'monthly', anchorDate: '2028-01-31' },
      '2028-01-01',
      '2028-02-29',
    );

    expect(dates).toEqual(['2028-01-31', '2028-02-29']);
  });

  it('places semimonthly paydays on the 1st and 15th', () => {
    const dates = occurrenceDatesInRange(
      { frequency: 'semimonthly', anchorDate: '2026-01-05' },
      '2026-02-01',
      '2026-03-31',
    );

    expect(dates).toEqual(['2026-02-01', '2026-02-15', '2026-03-01', '2026-03-15']);
  });

  it('steps biweekly from the anchor and respects the range', () => {
    const dates = occurrenceDatesInRange(
      { frequency: 'biweekly', anchorDate: '2026-01-01' },
      '2026-01-10',
      '2026-02-15',
    );

    expect(dates).toEqual(['2026-01-15', '2026-01-29', '2026-02-12']);
  });

  it('stops at an end date and never emits before the anchor', () => {
    const dates = occurrenceDatesInRange(
      { frequency: 'monthly', anchorDate: '2026-05-10', endDate: '2026-07-10' },
      '2026-01-01',
      '2026-12-31',
    );

    expect(dates).toEqual(['2026-05-10', '2026-06-10', '2026-07-10']);
  });

  it('emits a one-time date only once', () => {
    expect(
      occurrenceDatesInRange(
        { frequency: 'one-time', anchorDate: '2026-04-03' },
        '2026-01-01',
        '2026-12-31',
      ),
    ).toEqual(['2026-04-03']);
  });

  it('has no projection for irregular income', () => {
    expect(
      occurrenceDatesInRange(
        { frequency: 'irregular', anchorDate: '2026-04-03' },
        '2026-01-01',
        '2026-12-31',
      ),
    ).toEqual([]);
  });

  it('rejects invalid input and reversed ranges safely', () => {
    expect(
      occurrenceDatesInRange(
        { frequency: 'monthly', anchorDate: 'not-a-date' },
        '2026-01-01',
        '2026-12-31',
      ),
    ).toEqual([]);
    expect(
      occurrenceDatesInRange(
        { frequency: 'monthly', anchorDate: '2026-01-01' },
        '2026-12-31',
        '2026-01-01',
      ),
    ).toEqual([]);
  });
});

describe('occurrence helpers', () => {
  const rule = { frequency: 'biweekly' as const, anchorDate: '2026-01-01' };

  it('detects whether a date is an occurrence', () => {
    expect(isOccurrenceDate(rule, '2026-01-15')).toBe(true);
    expect(isOccurrenceDate(rule, '2026-01-16')).toBe(false);
  });

  it('finds the next and previous occurrence', () => {
    expect(nextOccurrence(rule, '2026-01-15')).toBe('2026-01-29');
    expect(previousOccurrence(rule, '2026-01-15')).toBe('2026-01-01');
  });
});
