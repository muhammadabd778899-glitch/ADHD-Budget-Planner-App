import { describe, expect, it } from 'vitest';
import { calculateSafeToSpend } from '@/domain/safeToSpend';
import {
  makeBill,
  makeIncomeSource,
  makeOccurrence,
  makeSavingsEntry,
  makeSettings,
  makeTransaction,
} from '@/test/fixtures';

const TODAY = '2026-03-10';

function baseInput() {
  return {
    settings: makeSettings({
      startingBalanceMinor: 100_000,
      cushionMinor: 20_000,
      planMode: 'paycheck' as const,
    }),
    transactions: [
      makeTransaction({
        type: 'income',
        amountMinor: 100_000,
        date: '2026-03-01',
        description: 'Paycheck received',
      }),
      makeTransaction({ amountMinor: 30_000, date: '2026-03-05', description: 'Groceries' }),
      makeTransaction({
        amountMinor: 15_000,
        date: '2026-03-11',
        description: 'Pending card charge',
        status: 'pending',
      }),
      makeTransaction({
        amountMinor: 40_000,
        date: '2026-03-20',
        description: 'Future expense',
      }),
    ],
    savingsEntries: [
      makeSavingsEntry({ amountMinor: 5000, date: '2026-03-02' }),
      makeSavingsEntry({ amountMinor: -1000, date: '2026-03-08' }),
    ],
    billOccurrences: [
      makeOccurrence({ id: 'occ-rent', billId: 'bill-rent', dueDate: '2026-03-11' }),
      makeOccurrence({
        id: 'occ-later',
        billId: 'bill-later',
        dueDate: '2026-03-20',
        amountMinor: 30_000,
      }),
      makeOccurrence({
        id: 'occ-paid',
        billId: 'bill-paid',
        dueDate: '2026-03-12',
        status: 'paid',
        amountMinor: 99_999,
      }),
    ],
    bills: [
      makeBill({ id: 'bill-rent' }),
      makeBill({ id: 'bill-later', name: 'Insurance', anchorDate: '2026-03-20' }),
      makeBill({ id: 'bill-paid', name: 'Phone', anchorDate: '2026-03-12' }),
    ],
    incomeSources: [makeIncomeSource()],
    today: TODAY,
  };
}

describe('calculateSafeToSpend', () => {
  it('uses cash on hand minus bills in the paycheck window minus the cushion', () => {
    const result = calculateSafeToSpend(baseInput());

    expect(result.planWindow).toMatchObject({
      start: TODAY,
      end: '2026-03-12',
      nextPayday: '2026-03-13',
      mode: 'paycheck',
    });
    expect(result.cashOnHandMinor).toBe(166_000);
    expect(result.receivedIncomeMinor).toBe(100_000);
    expect(result.actualSpendingMinor).toBe(30_000);
    expect(result.savingsContributionsMinor).toBe(5000);
    expect(result.savingsWithdrawalsMinor).toBe(1000);
    expect(result.reservedBillsMinor).toBe(25_000);
    expect(result.reservedBillCount).toBe(1);
    expect(result.safeToSpendMinor).toBe(121_000);
    expect(result.availableAfterBillsMinor).toBe(141_000);
  });

  it('keeps pending and future spending out of cash and safe to spend', () => {
    const result = calculateSafeToSpend(baseInput());

    expect(result.pendingExpensesMinor).toBe(15_000);
    expect(result.safeAfterPendingMinor).toBe(106_000);
    expect(result.spentThisMonthMinor).toBe(30_000);
    expect(result.incomeThisMonthMinor).toBe(100_000);
  });

  it('shows expected income separately without ever adding it to safe to spend', () => {
    const input = baseInput();
    input.settings = makeSettings({
      startingBalanceMinor: 100_000,
      cushionMinor: 20_000,
      planMode: 'month',
    });
    input.incomeSources = [
      makeIncomeSource({
        id: 'inc-bonus',
        name: 'Bonus',
        frequency: 'one-time',
        anchorDate: '2026-03-11',
        amountMinor: 50_000,
      }),
    ];

    const result = calculateSafeToSpend(input);

    expect(result.cashOnHandMinor).toBe(166_000);
    expect(result.reservedBillsMinor).toBe(55_000);
    expect(result.safeToSpendMinor).toBe(91_000);
    expect(result.expectedIncomeInWindowMinor).toBe(50_000);
    expect(result.safeToSpendMinor).toBe(
      result.cashOnHandMinor - result.reservedBillsMinor - input.settings.cushionMinor,
    );
  });

  it('reserves more bills in month mode and reports a negative plan honestly', () => {
    const input = baseInput();
    input.settings = makeSettings({
      startingBalanceMinor: 20_000,
      cushionMinor: 20_000,
      planMode: 'month',
    });

    const result = calculateSafeToSpend(input);

    expect(result.planWindow).toMatchObject({ start: '2026-03-01', end: '2026-03-31' });
    expect(result.reservedBillsMinor).toBe(55_000);
    expect(result.cashOnHandMinor).toBe(86_000);
    expect(result.safeToSpendMinor).toBe(11_000);

    input.settings = { ...input.settings, cushionMinor: 100_000 };
    const tighter = calculateSafeToSpend(input);
    expect(tighter.safeToSpendMinor).toBe(-69_000);
    expect(tighter.safeAfterPendingMinor).toBe(-84_000);
  });

  it('ignores archived bills for future reservations but keeps past unpaid occurrences', () => {
    const input = baseInput();
    input.bills = [
      makeBill({ id: 'bill-rent', active: false }),
      makeBill({ id: 'bill-later' }),
      makeBill({ id: 'bill-paid' }),
    ];
    input.billOccurrences.push(
      makeOccurrence({
        id: 'occ-past',
        billId: 'bill-rent',
        dueDate: '2026-03-01',
        amountMinor: 7000,
      }),
    );

    const result = calculateSafeToSpend(input);

    expect(result.reservedBillsMinor).toBe(7000);
    expect(result.reservedBillCount).toBe(1);
    expect(result.reservedOccurrences.map((occurrence) => occurrence.id)).toEqual(['occ-past']);
  });
});
