import type { DateOnly, Envelope, Transaction } from '@/domain/types';
import { addMonthsClamped, monthKey } from '@/lib/dates';

export interface EnvelopeProgress {
  envelope: Envelope;
  spentThisMonthMinor: number;
  availableMinor: number;
  carryMinor: number;
  monthsTracked: number;
  overspent: boolean;
}

function monthsBetween(startMonth: string, currentMonth: string): string[] {
  const months: string[] = [];
  let cursor = `${startMonth}-01`;
  for (let i = 0; i < 120; i += 1) {
    const key = monthKey(cursor);
    months.push(key);
    if (key >= currentMonth) break;
    cursor = addMonthsClamped(cursor, 1);
  }
  return months;
}

export function envelopeProgress(
  envelope: Envelope,
  transactions: Transaction[],
  today: DateOnly,
): EnvelopeProgress {
  const currentMonth = monthKey(today);
  const startMonth = envelope.startMonth > currentMonth ? currentMonth : envelope.startMonth;
  const months = envelope.rollover ? monthsBetween(startMonth, currentMonth) : [currentMonth];
  const tracked = new Set(months);
  let spentTotal = 0;
  let spentThisMonthMinor = 0;
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || transaction.status !== 'cleared') continue;
    if (transaction.categoryId !== envelope.categoryId) continue;
    const key = monthKey(transaction.date);
    if (!tracked.has(key)) continue;
    spentTotal += transaction.amountMinor;
    if (key === currentMonth) spentThisMonthMinor += transaction.amountMinor;
  }
  const fundedMinor = envelope.monthlyAmountMinor * months.length;
  const availableMinor = fundedMinor - spentTotal;
  return {
    envelope,
    spentThisMonthMinor,
    availableMinor,
    carryMinor: availableMinor - (envelope.monthlyAmountMinor - spentThisMonthMinor),
    monthsTracked: months.length,
    overspent: availableMinor < 0,
  };
}

export function envelopeProgressList(
  envelopes: Envelope[],
  transactions: Transaction[],
  today: DateOnly,
): EnvelopeProgress[] {
  return envelopes
    .filter((envelope) => !envelope.archived)
    .map((envelope) => envelopeProgress(envelope, transactions, today))
    .sort((a, b) => a.envelope.name.localeCompare(b.envelope.name));
}
