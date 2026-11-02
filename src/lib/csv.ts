import type { Bill, Category, Transaction } from '@/domain/types';
import { currencyFractionDigits, toMajorUnits } from '@/lib/money';
import { isValidDateOnly } from '@/lib/dates';

export function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const lines = [headers.map(sanitizeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(sanitizeCsvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function amountForCsv(minor: number, currency: string): string {
  const digits = currencyFractionDigits(currency);
  return toMajorUnits(minor, currency).toFixed(digits);
}

export function transactionsToCsv(
  transactions: Transaction[],
  categories: Category[],
  currency: string,
  bills: Bill[] = [],
): string {
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const billMap = new Map(bills.map((bill) => [bill.id, bill.name]));
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((transaction) => [
      transaction.date,
      transaction.type,
      transaction.description,
      transaction.categoryId ? (categoryMap.get(transaction.categoryId) ?? '') : '',
      amountForCsv(transaction.amountMinor, currency),
      currency,
      transaction.status,
      transaction.billId ? (billMap.get(transaction.billId) ?? '') : '',
      transaction.debtId ? 'Debt payment' : '',
      transaction.notes,
    ]);
  return toCsv(
    [
      'Date',
      'Type',
      'Description',
      'Category',
      'Amount',
      'Currency',
      'Status',
      'Bill',
      'Link',
      'Notes',
    ],
    rows,
  );
}

export function billsToCsv(bills: Bill[], categories: Category[], currency: string): string {
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const rows = [...bills]
    .sort((a, b) => a.anchorDate.localeCompare(b.anchorDate))
    .map((bill) => [
      bill.name,
      amountForCsv(bill.amountMinor, currency),
      currency,
      bill.frequency,
      bill.anchorDate,
      bill.endDate ?? '',
      bill.categoryId ? (categoryMap.get(bill.categoryId) ?? '') : '',
      bill.autoPay ? 'yes' : 'no',
      bill.active ? 'active' : 'archived',
      bill.notes,
    ]);
  return toCsv(
    [
      'Name',
      'Amount',
      'Currency',
      'Frequency',
      'First due',
      'Last due',
      'Category',
      'Autopay',
      'Status',
      'Notes',
    ],
    rows,
  );
}

export function isValidCsvDate(value: string): boolean {
  return isValidDateOnly(value);
}
