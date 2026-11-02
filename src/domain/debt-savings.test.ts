import { describe, expect, it } from 'vitest';
import { debtCurrentBalance, debtSummary, estimatePayoff, totalDebtMinor } from '@/domain/debt';
import { savingsGoalAmount, savingsSummary, totalSavingsMinor } from '@/domain/savings';
import { makeDebt, makeSavingsEntry, makeSavingsGoal, makeTransaction } from '@/test/fixtures';

describe('debt calculations', () => {
  const debt = makeDebt({ id: 'debt-visa', balanceMinor: 120_000 });

  it('subtracts only cleared linked expense payments by default', () => {
    const transactions = [
      makeTransaction({ id: 'pay-cleared', debtId: debt.id, amountMinor: 20_000 }),
      makeTransaction({
        id: 'pay-pending',
        debtId: debt.id,
        amountMinor: 5000,
        status: 'pending',
      }),
      makeTransaction({ id: 'unrelated', debtId: null, amountMinor: 99_999 }),
      makeTransaction({
        id: 'wrong-type',
        debtId: debt.id,
        type: 'income',
        amountMinor: 5000,
      }),
    ];

    expect(debtCurrentBalance(debt, transactions)).toBe(100_000);
    expect(debtCurrentBalance(debt, transactions, true)).toBe(95_000);
  });

  it('summarises paid, pending, and progress without forcing a zero floor', () => {
    const transactions = [
      makeTransaction({ id: 'pay-1', debtId: debt.id, amountMinor: 60_000 }),
      makeTransaction({ id: 'pay-2', debtId: debt.id, amountMinor: 80_000 }),
      makeTransaction({
        id: 'pay-pending',
        debtId: debt.id,
        amountMinor: 5000,
        status: 'pending',
      }),
    ];

    const summary = debtSummary(debt, transactions);
    expect(summary.currentBalanceMinor).toBe(-20_000);
    expect(summary.paidMinor).toBe(140_000);
    expect(summary.pendingPaymentMinor).toBe(5000);
    expect(summary.progress).toBe(54);
  });

  it('excludes archived debts from the total and floors individual balances', () => {
    const archived = makeDebt({ id: 'debt-old', archived: true, balanceMinor: 500_000 });
    const overpaid = makeDebt({ id: 'debt-over', balanceMinor: 1000 });
    const transactions = [
      makeTransaction({ id: 'overpayment', debtId: overpaid.id, amountMinor: 5000 }),
    ];

    expect(totalDebtMinor([debt, archived, overpaid], transactions)).toBe(120_000);
    expect(debtSummary(overpaid, transactions).currentBalanceMinor).toBe(-4000);
  });
});

describe('estimatePayoff', () => {
  it('returns immediately for a paid-off balance', () => {
    expect(estimatePayoff(0, 1999, 5000)).toMatchObject({ months: 0, feasible: true });
  });

  it('reports a missing or ineffective payment honestly', () => {
    expect(estimatePayoff(100_000, 1999, null)).toMatchObject({
      feasible: false,
      reason: 'missing-payment',
    });
    expect(estimatePayoff(100_000, 1999, 0)).toMatchObject({
      feasible: false,
      reason: 'missing-payment',
    });
    expect(estimatePayoff(100_000, 1999, 100)).toMatchObject({
      feasible: false,
      reason: 'payment-too-small',
    });
  });

  it('amortises a simple fixed payment without floating point totals', () => {
    const estimate = estimatePayoff(100_000, 0, 10_000);
    expect(estimate).toEqual({
      months: 10,
      totalPaidMinor: 100_000,
      totalInterestMinor: 0,
      feasible: true,
    });
  });

  it('adds monthly interest and stays within the safety cap', () => {
    const estimate = estimatePayoff(100_000, 1200, 10_000);
    expect(estimate.feasible).toBe(true);
    expect(estimate.months).toBeGreaterThan(10);
    expect(estimate.months).toBeLessThan(20);
    expect(estimate.totalInterestMinor).toBeGreaterThan(0);
    expect(estimate.totalPaidMinor).toBe(100_000 + estimate.totalInterestMinor);
  });
});

describe('savings calculations', () => {
  const goal = makeSavingsGoal({
    id: 'goal-emergency',
    startingMinor: 20_000,
    targetMinor: 100_000,
  });

  it('adds contributions and subtracts withdrawals for one goal', () => {
    const entries = [
      makeSavingsEntry({ goalId: goal.id, amountMinor: 30_000 }),
      makeSavingsEntry({ goalId: goal.id, amountMinor: -5000 }),
      makeSavingsEntry({ goalId: 'other-goal', amountMinor: 99_999 }),
    ];

    expect(savingsGoalAmount(goal, entries)).toBe(45_000);
    expect(savingsSummary(goal, entries)).toMatchObject({
      currentMinor: 45_000,
      remainingMinor: 55_000,
      progress: 45,
    });
  });

  it('caps visual progress without truncating the underlying amount', () => {
    const entries = [makeSavingsEntry({ goalId: goal.id, amountMinor: 200_000 })];
    const summary = savingsSummary(goal, entries);

    expect(summary.currentMinor).toBe(220_000);
    expect(summary.remainingMinor).toBe(0);
    expect(summary.progress).toBe(100);
  });

  it('total savings excludes archived goals', () => {
    const archived = makeSavingsGoal({
      id: 'goal-archived',
      archived: true,
      startingMinor: 500_000,
    });
    const entries = [makeSavingsEntry({ goalId: goal.id, amountMinor: 10_000 })];

    expect(totalSavingsMinor([goal, archived], entries)).toBe(30_000);
  });
});
