/**
 * Money is always an integer number of minor units (cents for USD, yen for JPY).
 * No financial total is ever produced with floating point arithmetic.
 */

const currencyDigitsCache = new Map<string, number>();

export function currencyFractionDigits(currency: string): number {
  const key = currency.toUpperCase();
  const cached = currencyDigitsCache.get(key);
  if (cached !== undefined) return cached;
  let digits: number;
  try {
    digits =
      new Intl.NumberFormat('en-US', { style: 'currency', currency: key }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    digits = 2;
  }
  currencyDigitsCache.set(key, digits);
  return digits;
}

export function normalizeDecimalInput(input: string): string | null {
  let value = input.trim().replace(/\s/g, '');
  if (!value) return null;
  value = value.replace(/[^\d.,+-]/g, '');
  if (!value || !/\d/.test(value)) return null;

  const sign = value.startsWith('-') ? '-' : value.startsWith('+') ? '' : '';
  value = value.replace(/[+-]/g, '');

  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      value = value.replace(/\./g, '').replace(/,/g, '.');
    } else {
      value = value.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const parts = value.split(',');
    const looksLikeThousands =
      parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3);
    value = looksLikeThousands ? value.replace(/,/g, '') : value.replace(',', '.');
  }

  return sign + value;
}

export function parseMoneyToMinor(input: string, currency = 'USD'): number | null {
  const normalized = normalizeDecimalInput(input);
  if (normalized === null) return null;
  if (normalized.startsWith('-')) return null;

  const digits = currencyFractionDigits(currency);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) return null;

  const whole = match[1] ?? '0';
  const fractionRaw = match[2] ?? '';
  if (fractionRaw.length > digits) return null;

  const fraction = fractionRaw.padEnd(digits, '0');
  const combined = `${whole}${fraction}`.replace(/^0+(?=\d)/, '');
  const value = Number(combined);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

/** Parses a signed amount. Used for savings contributions (+), withdrawals (−). */
export function parseSignedMoneyToMinor(input: string, currency = 'USD'): number | null {
  const trimmed = input.trim();
  if (trimmed.startsWith('-')) {
    const absolute = parseMoneyToMinor(trimmed.slice(1), currency);
    return absolute === null ? null : -absolute;
  }
  return parseMoneyToMinor(trimmed, currency);
}

export function toMajorUnits(minor: number, currency = 'USD'): number {
  return minor / 10 ** currencyFractionDigits(currency);
}

export function minorToInput(minor: number, currency = 'USD'): string {
  if (!Number.isFinite(minor)) return '';
  const digits = currencyFractionDigits(currency);
  const sign = minor < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(minor))
    .toString()
    .padStart(digits + 1, '0');
  if (digits === 0) return `${sign}${absolute}`;
  const whole = absolute.slice(0, -digits);
  const fraction = absolute.slice(-digits);
  return `${sign}${whole}.${fraction}`;
}

export function currencySymbol(currency = 'USD', locale = 'en-US'): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

export function formatMoney(
  minor: number,
  currency = 'USD',
  locale = 'en-US',
  options: { showSign?: boolean } = {},
): string {
  const digits = currencyFractionDigits(currency);
  const major = toMajorUnits(minor, currency);
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major);
  } catch {
    formatted = `${currency} ${major.toFixed(digits)}`;
  }
  if (options.showSign && minor > 0) return `+${formatted}`;
  return formatted;
}

export function formatMoneyShort(minor: number, currency = 'USD', locale = 'en-US'): string {
  const digits = currencyFractionDigits(currency);
  const major = toMajorUnits(minor, currency);
  const whole = Math.abs(major) >= 1000;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: whole ? 'compact' : 'standard',
      maximumFractionDigits: whole ? 1 : digits,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(digits)}`;
  }
}

export function sumMinor(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function clampMinor(value: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return Math.min(Math.max(value, min), max);
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
