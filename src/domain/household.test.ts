import { describe, expect, it } from 'vitest';
import type { AppSnapshot } from '@/domain/types';
import { accountSafeToSpendInput, DEFAULT_ACCOUNT_ID } from '@/domain/accounts';
import { envelopeProgress } from '@/domain/envelopes';
import { calculateSafeToSpend } from '@/domain/safeToSpend';
import { contributedThisMonthMinor, suggestedSetAsideMinor } from '@/domain/savings';
import {
  makeAccount,
  makeBill,
  makeEnvelope,
  makeIncomeSource,
  makeOccurrence,
  makeSavingsEntry,
  makeSavingsGoal,
  makeSettings,
  makeTransaction,
} from '@/test/fixtures';

function snapshot(overrides: Partial<AppSnapshot> = {}): AppSnapshot {
  return {
    settings: makeSettings({
      planMode: 'month',
      startingBalanceMinor: 10_000,
      cushionMinor: 2_000,
    }),
    accounts: [
      makeAccount({ id: DEFAULT_ACCOUNT_ID, name: 'Main account', openingBalanceMinor: 0 }),
      makeAccount({ id: 'acct-wallet', name: 'Wallet', openingBalanceMinor: 50_000 }),
    ],
    categories: [],
    incomeSources: [],
    bills: [],
    billOccurrences: [],
    transactions: [],
    debts: [],
    savingsGoals: [],
    savingsEntries: [],
    envelopes: [],
    notes: [],
    storage: { persisted: null, supported: true, usageBytes: null, quotaBytes: null },
    ...overrides,
  };
}

describe('account-scoped safe to spend', () => {
  it('uses opening balance and no cushion for a secondary account', () => {
    const bills = [
      makeBill({ id: 'bill-main', amountMinor: 2_000, anchorDate: '2026-03-20' }),
      makeBill({
        id: 'bill-wallet',
        amountMinor: 1_000,
        anchorDate: '2026-03-20',
        accountId: 'acct-wallet',
      }),
    ];
    const snapshotData = snapshot({
      bills,
      billOccurrences: [
        makeOccurrence({
          id: 'occ-main',
          billId: 'bill-main',
          dueDate: '2026-03-20',
          amountMinor: 2_000,
        }),
        makeOccurrence({
          id: 'occ-wallet',
          billId: 'bill-wallet',
          dueDate: '2026-03-20',
          amountMinor: 1_000,
        }),
      ],
      incomeSources: [makeIncomeSource({ amountMinor: 8_000 })],
      transactions: [
        makeTransaction({ amountMinor: 1_000, date: '2026-03-05' }),
        makeTransaction({
          amountMinor: 8_000,
          type: 'income',
          date: '2026-03-05',
        }),
        makeTransaction({
          amountMinor: 3_000,
          date: '2026-03-05',
          accountId: 'acct-wallet',
        }),
      ],
      savingsEntries: [
        makeSavingsEntry({ amountMinor: 1_000, date: '2026-03-06' }),
        makeSavingsEntry({ amountMinor: 2_000, date: '2026-03-06', accountId: 'acct-wallet' }),
        makeSavingsEntry({ amountMinor: -500, date: '2026-03-07', accountId: 'acct-wallet' }),
      ],
    });

    const main = calculateSafeToSpend(
      accountSafeToSpendInput(snapshotData, DEFAULT_ACCOUNT_ID, '2026-03-10'),
    );
    const wallet = calculateSafeToSpend(
      accountSafeToSpendInput(snapshotData, 'acct-wallet', '2026-03-10'),
    );

    expect(main).toMatchObject({
      startingBalanceMinor: 10_000,
      receivedIncomeMinor: 8_000,
      actualSpendingMinor: 1_000,
      savingsContributionsMinor: 1_000,
      reservedBillsMinor: 2_000,
      cushionMinor: 2_000,
      safeToSpendMinor: 12_000,
    });
    expect(wallet).toMatchObject({
      startingBalanceMinor: 50_000,
      actualSpendingMinor: 3_000,
      savingsContributionsMinor: 2_000,
      savingsWithdrawalsMinor: 500,
      reservedBillsMinor: 1_000,
      cushionMinor: 0,
      safeToSpendMinor: 44_500,
    });
  });

  it('treats records without an account as belonging to the main account', () => {
    const input = accountSafeToSpendInput(
      snapshot({
        transactions: [makeTransaction({ amountMinor: 1_000, accountId: null })],
      }),
      DEFAULT_ACCOUNT_ID,
      '2026-03-10',
    );

    expect(input.transactions).toHaveLength(1);
  });
});

describe('envelope progress', () => {
  const food = 'cat-groceries';

  it('tracks rollover months and ignores pending or other categories', () => {
    const envelope = makeEnvelope({
      categoryId: food,
      monthlyAmountMinor: 40_000,
      rollover: true,
      startMonth: '2026-01',
    });
    const progress = envelopeProgress(
      envelope,
      [
        makeTransaction({ categoryId: food, amountMinor: 10_000, date: '2026-01-15' }),
        makeTransaction({ categoryId: food, amountMinor: 10_000, date: '2026-02-15' }),
        makeTransaction({ categoryId: food, amountMinor: 5_000, date: '2026-03-02' }),
        makeTransaction({
          categoryId: food,
          amountMinor: 9_000,
          date: '2026-03-03',
          status: 'pending',
        }),
        makeTransaction({ categoryId: 'cat-fun', amountMinor: 7_000, date: '2026-03-04' }),
      ],
      '2026-03-10',
    );

    expect(progress).toMatchObject({
      spentThisMonthMinor: 5_000,
      availableMinor: 95_000,
      carryMinor: 60_000,
      monthsTracked: 3,
      overspent: false,
    });
  });

  it('uses only the current month when rollover is off', () => {
    const envelope = makeEnvelope({
      categoryId: food,
      monthlyAmountMinor: 40_000,
      rollover: false,
      startMonth: '2026-01',
    });
    const progress = envelopeProgress(
      envelope,
      [
        makeTransaction({ categoryId: food, amountMinor: 10_000, date: '2026-01-15' }),
        makeTransaction({ categoryId: food, amountMinor: 5_000, date: '2026-03-02' }),
      ],
      '2026-03-10',
    );

    expect(progress).toMatchObject({
      spentThisMonthMinor: 5_000,
      availableMinor: 35_000,
      monthsTracked: 1,
      overspent: false,
    });
  });

  it('marks an envelope as overspent', () => {
    const envelope = makeEnvelope({
      categoryId: food,
      monthlyAmountMinor: 10_000,
      rollover: false,
      startMonth: '2026-03',
    });
    const progress = envelopeProgress(
      envelope,
      [makeTransaction({ categoryId: food, amountMinor: 12_000, date: '2026-03-02' })],
      '2026-03-10',
    );

    expect(progress.availableMinor).toBe(-2_000);
    expect(progress.overspent).toBe(true);
  });
});

describe('sinking fund suggestions', () => {
  it('prefers the monthly target over the income percentage', () => {
    const goal = makeSavingsGoal({
      kind: 'sinking',
      monthlyTargetMinor: 10_000,
      autoSavePercent: 20,
    });

    expect(suggestedSetAsideMinor(goal, 100_000, 2_000)).toBe(8_000);
  });

  it('uses a percentage of received income when no target is set', () => {
    const goal = makeSavingsGoal({ kind: 'sinking', monthlyTargetMinor: 0, autoSavePercent: 10 });

    expect(suggestedSetAsideMinor(goal, 100_000, 0)).toBe(10_000);
    expect(suggestedSetAsideMinor(goal, 100_000, 12_000)).toBe(0);
    expect(suggestedSetAsideMinor(goal, 0, 0)).toBe(0);
  });

  it('counts contributions and withdrawals for the current month only', () => {
    const goal = makeSavingsGoal({ id: 'goal-sink', kind: 'sinking' });

    expect(
      contributedThisMonthMinor(
        goal,
        [
          makeSavingsEntry({ goalId: goal.id, amountMinor: 5_000, date: '2026-03-02' }),
          makeSavingsEntry({ goalId: goal.id, amountMinor: -1_000, date: '2026-03-03' }),
          makeSavingsEntry({ goalId: goal.id, amountMinor: 7_000, date: '2026-02-02' }),
          makeSavingsEntry({ goalId: 'other-goal', amountMinor: 9_000, date: '2026-03-04' }),
        ],
        '2026-03-10',
      ),
    ).toBe(4_000);
  });
});
