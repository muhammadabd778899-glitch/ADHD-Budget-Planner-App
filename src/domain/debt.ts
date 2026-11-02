import type { Debt, Transaction } from '@/domain/types';

export interface DebtSummary {
  debt: Debt;
  currentBalanceMinor: number;
  paidMinor: number;
  pendingPaymentMinor: number;
  progress: number;
}

export function debtCurrentBalance(
  debt: Debt,
  transactions: Transaction[],
  includePending = false,
): number {
  const payments = transactions.filter(
    (transaction) =>
      transaction.debtId === debt.id &&
      transaction.type === 'expense' &&
      (includePending || transaction.status === 'cleared'),
  );
  return debt.balanceMinor - payments.reduce((total, payment) => total + payment.amountMinor, 0);
}

export function debtSummary(debt: Debt, transactions: Transaction[]): DebtSummary {
  const current = debtCurrentBalance(debt, transactions);
  const paid = transactions
    .filter(
      (transaction) =>
        transaction.debtId === debt.id &&
        transaction.type === 'expense' &&
        transaction.status === 'cleared',
    )
    .reduce((total, transaction) => total + transaction.amountMinor, 0);
  const pending = transactions
    .filter(
      (transaction) =>
        transaction.debtId === debt.id &&
        transaction.type === 'expense' &&
        transaction.status === 'pending',
    )
    .reduce((total, transaction) => total + transaction.amountMinor, 0);
  const denominator = debt.balanceMinor + paid;
  return {
    debt,
    currentBalanceMinor: current,
    paidMinor: paid,
    pendingPaymentMinor: pending,
    progress:
      denominator <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((paid / denominator) * 100))),
  };
}

export function totalDebtMinor(debts: Debt[], transactions: Transaction[]): number {
  return debts
    .filter((debt) => !debt.archived)
    .reduce((total, debt) => total + Math.max(0, debtCurrentBalance(debt, transactions)), 0);
}

export interface PayoffEstimate {
  months: number;
  totalPaidMinor: number;
  totalInterestMinor: number;
  feasible: boolean;
  reason?: 'no-balance' | 'missing-payment' | 'payment-too-small' | 'no-progress';
}

/**
 * A deliberately simple estimate: fixed monthly payment, monthly compounding,
 * rounded interest each month. Not a promise and not financial advice.
 */
export function estimatePayoff(
  balanceMinor: number,
  annualRateBps: number | null,
  paymentMinor: number | null,
): PayoffEstimate {
  if (balanceMinor <= 0) {
    return { months: 0, totalPaidMinor: 0, totalInterestMinor: 0, feasible: true };
  }
  if (!paymentMinor || paymentMinor <= 0) {
    return {
      months: 0,
      totalPaidMinor: 0,
      totalInterestMinor: 0,
      feasible: false,
      reason: 'missing-payment',
    };
  }
  const monthlyRate = (annualRateBps ?? 0) / 10000 / 12;
  const firstInterest = Math.round(balanceMinor * monthlyRate);
  if (paymentMinor <= firstInterest) {
    return {
      months: 0,
      totalPaidMinor: 0,
      totalInterestMinor: 0,
      feasible: false,
      reason: 'payment-too-small',
    };
  }

  let balance = balanceMinor;
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;
  while (balance > 0 && months < 600) {
    const interest = Math.round(balance * monthlyRate);
    const payment = Math.min(paymentMinor, balance + interest);
    const principal = payment - interest;
    if (principal <= 0) {
      return {
        months: 0,
        totalPaidMinor: 0,
        totalInterestMinor: 0,
        feasible: false,
        reason: 'no-progress',
      };
    }
    balance = balance + interest - payment;
    totalInterest += interest;
    totalPaid += payment;
    months += 1;
  }

  return {
    months,
    totalPaidMinor: totalPaid,
    totalInterestMinor: totalInterest,
    feasible: balance <= 0,
  };
}
