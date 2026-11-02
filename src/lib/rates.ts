import { normalizeDecimalInput } from '@/lib/money';

/** Converts a percentage string (e.g. "21.99") to basis points (2199). */
export function parsePercentToBps(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = normalizeDecimalInput(trimmed);
  if (normalized === null || normalized.startsWith('-')) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value * 100);
}

export function bpsToPercentInput(bps: number): string {
  return (bps / 100)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
}

export function formatBps(bps: number | null): string {
  if (bps === null) return '—';
  return `${bpsToPercentInput(bps)}%`;
}
