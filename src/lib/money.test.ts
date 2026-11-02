import { describe, expect, it } from 'vitest';
import {
  currencyFractionDigits,
  formatMoney,
  formatMoneyShort,
  formatPercent,
  minorToInput,
  normalizeDecimalInput,
  parseMoneyToMinor,
  parseSignedMoneyToMinor,
  percent,
  sumMinor,
  toMajorUnits,
} from '@/lib/money';

describe('currencyFractionDigits', () => {
  it('uses two digits for USD and zero for JPY', () => {
    expect(currencyFractionDigits('USD')).toBe(2);
    expect(currencyFractionDigits('jpy')).toBe(0);
  });

  it('falls back safely for an unknown currency', () => {
    expect(currencyFractionDigits('NOT-A-CURRENCY')).toBe(2);
  });
});

describe('normalizeDecimalInput', () => {
  it('accepts common thousands and decimal separators', () => {
    expect(normalizeDecimalInput('1,234.56')).toBe('1234.56');
    expect(normalizeDecimalInput('1.234,56')).toBe('1234.56');
    expect(normalizeDecimalInput('1 234,56')).toBe('1234.56');
    expect(normalizeDecimalInput('$1,234.56')).toBe('1234.56');
  });

  it('treats a single trailing three-digit group as thousands', () => {
    expect(normalizeDecimalInput('12,345')).toBe('12345');
    expect(normalizeDecimalInput('1,234')).toBe('1234');
  });

  it('treats a short group after a comma as decimals', () => {
    expect(normalizeDecimalInput('12,5')).toBe('12.5');
    expect(normalizeDecimalInput('0,99')).toBe('0.99');
  });

  it('returns null for empty and non-numeric input', () => {
    expect(normalizeDecimalInput('')).toBeNull();
    expect(normalizeDecimalInput('   ')).toBeNull();
    expect(normalizeDecimalInput('abc')).toBeNull();
  });
});

describe('parseMoneyToMinor', () => {
  it('parses integer minor units without floating point arithmetic', () => {
    expect(parseMoneyToMinor('0')).toBe(0);
    expect(parseMoneyToMinor('1')).toBe(100);
    expect(parseMoneyToMinor('1.05')).toBe(105);
    expect(parseMoneyToMinor('1,234.56')).toBe(123_456);
    expect(parseMoneyToMinor('1234.5')).toBe(123_450);
  });

  it('rejects negative, malformed, and over-precise amounts', () => {
    expect(parseMoneyToMinor('-1')).toBeNull();
    expect(parseMoneyToMinor('1.234')).toBeNull();
    expect(parseMoneyToMinor('1.2.3')).toBeNull();
    expect(parseMoneyToMinor('')).toBeNull();
    expect(parseMoneyToMinor('$')).toBeNull();
  });

  it('respects zero-decimal currencies', () => {
    expect(parseMoneyToMinor('1234', 'JPY')).toBe(1234);
    expect(parseMoneyToMinor('1234.5', 'JPY')).toBeNull();
  });
});

describe('parseSignedMoneyToMinor', () => {
  it('accepts a leading minus for withdrawals', () => {
    expect(parseSignedMoneyToMinor('25.50')).toBe(2550);
    expect(parseSignedMoneyToMinor('-25.50')).toBe(-2550);
    expect(parseSignedMoneyToMinor('-')).toBeNull();
  });
});

describe('money formatting', () => {
  it('renders minor units as an editable amount', () => {
    expect(minorToInput(0)).toBe('0.00');
    expect(minorToInput(5)).toBe('0.05');
    expect(minorToInput(123_456)).toBe('1234.56');
    expect(minorToInput(-2550)).toBe('-25.50');
    expect(minorToInput(1234, 'JPY')).toBe('1234');
  });

  it('converts to major units only at the display boundary', () => {
    expect(toMajorUnits(123_456)).toBe(1234.56);
    expect(toMajorUnits(1234, 'JPY')).toBe(1234);
  });

  it('formats currency with an optional positive sign', () => {
    expect(formatMoney(123_456, 'USD', 'en-US')).toBe('$1,234.56');
    expect(formatMoney(-123_456, 'USD', 'en-US')).toBe('-$1,234.56');
    expect(formatMoney(123_456, 'USD', 'en-US', { showSign: true })).toBe('+$1,234.56');
    expect(formatMoneyShort(1_500_000, 'USD', 'en-US')).toBe('$15K');
  });
});

describe('money helpers', () => {
  it('sums and clamps safely', () => {
    expect(sumMinor([100, -250, 25])).toBe(-125);
    expect(percent(25, 100)).toBe(25);
    expect(percent(150, 100)).toBe(100);
    expect(percent(50, 0)).toBe(0);
    expect(formatPercent(33.6)).toBe('34%');
  });
});
