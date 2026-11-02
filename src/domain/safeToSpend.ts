import type {
  Bill,
  BillOccurrence,
  DateOnly,
  IncomeSource,
  SavingsEntry,
  Settings,
  Transaction,
} from '@/domain/types';
import { endOfMonth, monthKey, startOfMonth, isInRange, addDays, todayISO } from '@/lib/dates';
import { projectPaydays, getPlanWindow, type PlanWindow } from '@/domain/planning';

export interface SafeToSpendInput {
  settings: Settings;
  transactions: Transaction[];
  savingsEntries: SavingsEntry[];
  billOccurrences: BillOccurrence[];
  bills: Bill[];
  incomeSources: IncomeSource[];
  today?: DateOnly;
}

export interface SafeToSpendBreakdown {
  today: DateOnly;
  planWindow: PlanWindow;
  startingBalanceMinor: number;
  receivedIncomeMinor: number;
  actualSpendingMinor: number;
  savingsContributionsMinor: number;
  savingsWithdrawalsMinor: number;
  cashOnHandMinor: number;
  reservedBillsMinor: number;
  reservedBillCount: number;
  reservedOccurrences: BillOccurrence[];
  availableAfterBillsMinor: number;
  cushionMinor: number;
  safeToSpendMinor: number;
  pendingExpensesMinor: number;
  safeAfterPendingMinor: number;
  expectedIncomeInWindowMinor: number;
  receivedIncomeInWindowMinor: number;
  spentThisMonthMinor: number;
  incomeThisMonthMinor: number;
  nextPayday: DateOnly | null;
  nextPaydayAmountMinor: number;
}

export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendBreakdown {
  const today = input.today ?? todayISO();
  const planWindow = getPlanWindow(input.settings.planMode, today, input.incomeSources);

  let receivedIncomeMinor = 0;
  let actualSpendingMinor = 0;
  let pendingExpensesMinor = 0;
  let receivedIncomeInWindowMinor = 0;
  let spentThisMonthMinor = 0;
  let incomeThisMonthMinor = 0;
  const thisMonth = monthKey(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  for (const transaction of input.transactions) {
    const isCleared = transaction.status === 'cleared';
    if (transaction.date <= today && isCleared) {
      if (transaction.type === 'income') receivedIncomeMinor += transaction.amountMinor;
      else actualSpendingMinor += transaction.amountMinor;
    }
    if (isCleared && transaction.date >= planWindow.start && transaction.date <= planWindow.end) {
      if (transaction.type === 'income') receivedIncomeInWindowMinor += transaction.amountMinor;
    }
    if (transaction.type === 'expense' && transaction.status === 'pending') {
      if (transaction.date <= planWindow.end) pendingExpensesMinor += transaction.amountMinor;
    }
    if (
      isCleared &&
      transaction.date <= today &&
      monthKey(transaction.date) === thisMonth &&
      transaction.date >= monthStart &&
      transaction.date <= monthEnd
    ) {
      if (transaction.type === 'income') incomeThisMonthMinor += transaction.amountMinor;
      else spentThisMonthMinor += transaction.amountMinor;
    }
  }

  let savingsContributionsMinor = 0;
  let savingsWithdrawalsMinor = 0;
  for (const entry of input.savingsEntries) {
    if (entry.date > today) continue;
    if (entry.amountMinor > 0) savingsContributionsMinor += entry.amountMinor;
    else savingsWithdrawalsMinor += Math.abs(entry.amountMinor);
  }

  const cashOnHandMinor =
    input.settings.startingBalanceMinor +
    receivedIncomeMinor -
    actualSpendingMinor -
    savingsContributionsMinor +
    savingsWithdrawalsMinor;

  const billById = new Map(input.bills.map((bill) => [bill.id, bill]));
  const reservedOccurrences = input.billOccurrences
    .filter((occurrence) => {
      if (occurrence.status !== 'unpaid') return false;
      if (occurrence.dueDate > planWindow.end) return false;
      const bill = billById.get(occurrence.billId);
      if (bill && !bill.active && occurrence.dueDate >= today) return false;
      return true;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const reservedBillsMinor = reservedOccurrences.reduce(
    (total, occurrence) => total + occurrence.amountMinor,
    0,
  );
  const availableAfterBillsMinor = cashOnHandMinor - reservedBillsMinor;
  const safeToSpendMinor = availableAfterBillsMinor - input.settings.cushionMinor;

  const expectedIncomeInWindowMinor = projectPaydays(
    input.incomeSources,
    planWindow.start,
    planWindow.end,
  ).reduce((total, payday) => total + payday.amountMinor, 0);

  const nextPaydayRows = projectPaydays(
    input.incomeSources,
    addDays(today, 1),
    addDays(today, 730),
  );
  const nextPayday = nextPaydayRows[0]?.date ?? null;
  const nextPaydayAmountMinor = nextPayday
    ? nextPaydayRows
        .filter((row) => row.date === nextPayday)
        .reduce((total, row) => total + row.amountMinor, 0)
    : 0;

  return {
    today,
    planWindow,
    startingBalanceMinor: input.settings.startingBalanceMinor,
    receivedIncomeMinor,
    actualSpendingMinor,
    savingsContributionsMinor,
    savingsWithdrawalsMinor,
    cashOnHandMinor,
    reservedBillsMinor,
    reservedBillCount: reservedOccurrences.length,
    reservedOccurrences,
    availableAfterBillsMinor,
    cushionMinor: input.settings.cushionMinor,
    safeToSpendMinor,
    pendingExpensesMinor,
    safeAfterPendingMinor: safeToSpendMinor - pendingExpensesMinor,
    expectedIncomeInWindowMinor,
    receivedIncomeInWindowMinor,
    spentThisMonthMinor,
    incomeThisMonthMinor,
    nextPayday,
    nextPaydayAmountMinor,
  };
}

export function isBillDueInWindow(occurrence: BillOccurrence, window: PlanWindow): boolean {
  return isInRange(occurrence.dueDate, window.start, window.end);
}
