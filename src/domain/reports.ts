import type { BillOccurrence, Category, DateOnly, Transaction } from '@/domain/types';
import { addMonthsClamped, endOfMonth, formatMonth, monthKey, startOfMonth } from '@/lib/dates';

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  color: string;
  totalMinor: number;
  share: number;
}

export function categoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  from: DateOnly,
  to: DateOnly,
  type: 'expense' | 'income' = 'expense',
): CategoryTotal[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string | null, number>();
  for (const transaction of transactions) {
    if (transaction.type !== type) continue;
    if (transaction.status !== 'cleared') continue;
    if (transaction.date < from || transaction.date > to) continue;
    totals.set(
      transaction.categoryId,
      (totals.get(transaction.categoryId) ?? 0) + transaction.amountMinor,
    );
  }
  const grand = [...totals.values()].reduce((total, value) => total + value, 0);
  return [...totals.entries()]
    .map(([categoryId, totalMinor]) => {
      const category = categoryId ? categoryMap.get(categoryId) : undefined;
      return {
        categoryId,
        name: category?.name ?? 'Uncategorised',
        color: category?.color ?? 'stone',
        totalMinor,
        share: grand === 0 ? 0 : Math.round((totalMinor / grand) * 100),
      };
    })
    .sort((a, b) => b.totalMinor - a.totalMinor);
}

export interface MonthSummary {
  month: DateOnly;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
  pendingExpenseMinor: number;
  netMinor: number;
  byCategory: CategoryTotal[];
}

export function monthSummary(
  transactions: Transaction[],
  categories: Category[],
  month: DateOnly,
): MonthSummary {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  let incomeMinor = 0;
  let expenseMinor = 0;
  let pendingExpenseMinor = 0;
  for (const transaction of transactions) {
    if (transaction.date < start || transaction.date > end) continue;
    if (transaction.type === 'income' && transaction.status === 'cleared') {
      incomeMinor += transaction.amountMinor;
    }
    if (transaction.type === 'expense') {
      if (transaction.status === 'cleared') expenseMinor += transaction.amountMinor;
      else pendingExpenseMinor += transaction.amountMinor;
    }
  }
  return {
    month,
    label: formatMonth(month),
    incomeMinor,
    expenseMinor,
    pendingExpenseMinor,
    netMinor: incomeMinor - expenseMinor,
    byCategory: categoryBreakdown(transactions, categories, start, end, 'expense'),
  };
}

export interface TrendPoint {
  month: DateOnly;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
}

export function monthlyTrend(
  transactions: Transaction[],
  today: DateOnly,
  months = 6,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const month = startOfMonth(addMonthsClamped(today, -index));
    const summary = monthSummary(transactions, [], month);
    points.push({
      month,
      label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
        new Date(`${month}T00:00:00Z`),
      ),
      incomeMinor: summary.incomeMinor,
      expenseMinor: summary.expenseMinor,
    });
  }
  return points;
}

export function spendingByMonth(transactions: Transaction[], month: DateOnly): Map<string, number> {
  const result = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || transaction.status !== 'cleared') continue;
    if (monthKey(transaction.date) !== monthKey(month)) continue;
    result.set(
      transaction.categoryId ?? 'uncategorised',
      (result.get(transaction.categoryId ?? 'uncategorised') ?? 0) + transaction.amountMinor,
    );
  }
  return result;
}

export interface UpcomingBillRow {
  occurrence: BillOccurrence;
  status: 'overdue' | 'today' | 'soon' | 'later';
  daysAway: number;
}

export function sortOccurrencesForDisplay(
  occurrences: readonly BillOccurrence[],
): BillOccurrence[] {
  return [...occurrences].sort((a, b) => {
    const aOpen = a.status === 'unpaid' ? 0 : 1;
    const bOpen = b.status === 'unpaid' ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return a.dueDate.localeCompare(b.dueDate);
  });
}
