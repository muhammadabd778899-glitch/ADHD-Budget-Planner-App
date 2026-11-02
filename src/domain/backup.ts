import { backupSchema, type BackupFile, type BackupPayload } from '@/domain/schemas';
import type { Category, Transaction } from '@/domain/types';
import { nowIso } from '@/lib/ids';

export const BACKUP_FORMAT = 'tide-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 15 * 1024 * 1024;

export interface BackupValidationSuccess {
  ok: true;
  backup: BackupFile;
  summary: BackupSummary;
}

export interface BackupValidationFailure {
  ok: false;
  errors: string[];
}

export type BackupValidationResult = BackupValidationSuccess | BackupValidationFailure;

export interface BackupSummary {
  exportedAt: string;
  appVersion: string;
  counts: Record<string, number>;
  totalRecords: number;
}

export function countPayload(payload: BackupPayload): Record<string, number> {
  return {
    categories: payload.categories.length,
    incomeSources: payload.incomeSources.length,
    bills: payload.bills.length,
    billOccurrences: payload.billOccurrences.length,
    transactions: payload.transactions.length,
    debts: payload.debts.length,
    savingsGoals: payload.savingsGoals.length,
    savingsEntries: payload.savingsEntries.length,
  };
}

export function buildBackup(payload: BackupPayload, appVersion: string): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    appVersion,
    counts: countPayload(payload),
    data: payload,
  };
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

export function validateRelationships(payload: BackupPayload): string[] {
  const errors: string[] = [];
  if (payload.settings.id !== 'app') errors.push('Settings record must use the id "app".');

  const categoryIds = new Set(payload.categories.map((category) => category.id));
  const billIds = new Set(payload.bills.map((bill) => bill.id));
  const incomeSourceIds = new Set(payload.incomeSources.map((source) => source.id));
  const debtIds = new Set(payload.debts.map((debt) => debt.id));
  const goalIds = new Set(payload.savingsGoals.map((goal) => goal.id));
  const transactionIds = new Set(payload.transactions.map((transaction) => transaction.id));
  const occurrenceIds = new Set(payload.billOccurrences.map((occurrence) => occurrence.id));
  const categoryById = new Map(payload.categories.map((category) => [category.id, category]));

  const duplicateChecks: Array<[string, string[]]> = [
    ['categories', payload.categories.map((record) => record.id)],
    ['incomeSources', payload.incomeSources.map((record) => record.id)],
    ['bills', payload.bills.map((record) => record.id)],
    ['billOccurrences', payload.billOccurrences.map((record) => record.id)],
    ['transactions', payload.transactions.map((record) => record.id)],
    ['debts', payload.debts.map((record) => record.id)],
    ['savingsGoals', payload.savingsGoals.map((record) => record.id)],
    ['savingsEntries', payload.savingsEntries.map((record) => record.id)],
  ];
  for (const [table, ids] of duplicateChecks) {
    const dupes = duplicates(ids);
    if (dupes.length > 0) {
      errors.push(`${table} contains duplicate ids: ${dupes.slice(0, 3).join(', ')}`);
    }
  }

  const occurrenceKeyDupes = duplicates(
    payload.billOccurrences.map((occurrence) => `${occurrence.billId}__${occurrence.dueDate}`),
  );
  if (occurrenceKeyDupes.length > 0) {
    errors.push(
      `billOccurrences contains duplicate bill/due-date pairs: ${occurrenceKeyDupes
        .slice(0, 3)
        .join(', ')}`,
    );
  }

  const linkedOccurrences = duplicates(
    payload.transactions
      .map((transaction) => transaction.billOccurrenceId)
      .filter((value): value is string => Boolean(value)),
  );
  if (linkedOccurrences.length > 0) {
    errors.push(
      `More than one transaction is linked to a bill occurrence: ${linkedOccurrences
        .slice(0, 3)
        .join(', ')}`,
    );
  }

  for (const category of payload.categories) {
    if (category.id.startsWith('sample-') !== category.sample) {
      // Not an error for real records, but sample records must be clearly identifiable.
      if (category.sample) errors.push(`Sample category ${category.id} must use a sample- id.`);
    }
  }

  for (const bill of payload.bills) {
    if (bill.categoryId && !categoryIds.has(bill.categoryId)) {
      errors.push(`Bill "${bill.name}" references a missing category.`);
    }
  }

  for (const source of payload.incomeSources) {
    if (source.endDate && source.endDate < source.anchorDate) {
      errors.push(`Income source "${source.name}" ends before it starts.`);
    }
  }

  for (const bill of payload.bills) {
    if (bill.endDate && bill.endDate < bill.anchorDate) {
      errors.push(`Bill "${bill.name}" ends before it starts.`);
    }
  }

  for (const occurrence of payload.billOccurrences) {
    if (!billIds.has(occurrence.billId)) {
      errors.push(`Bill occurrence ${occurrence.id} references a missing bill.`);
    }
    if (occurrence.status === 'paid') {
      if (!occurrence.paidTransactionId) {
        errors.push(`Paid occurrence ${occurrence.id} has no payment transaction.`);
      } else if (!transactionIds.has(occurrence.paidTransactionId)) {
        errors.push(`Paid occurrence ${occurrence.id} references a missing transaction.`);
      }
      if (!occurrence.paidAt) {
        errors.push(`Paid occurrence ${occurrence.id} has no payment date.`);
      }
    }
    if (occurrence.status !== 'paid' && occurrence.paidTransactionId) {
      errors.push(`Occurrence ${occurrence.id} is not paid but has a payment transaction.`);
    }
  }

  const transactionById = new Map(
    payload.transactions.map((transaction) => [transaction.id, transaction]),
  );
  const occurrenceById = new Map(
    payload.billOccurrences.map((occurrence) => [occurrence.id, occurrence]),
  );

  for (const transaction of payload.transactions) {
    if (transaction.categoryId) {
      const category = categoryById.get(transaction.categoryId);
      if (!category) {
        errors.push(`Transaction "${transaction.description}" references a missing category.`);
      } else if (category.kind !== transaction.type) {
        errors.push(
          `Transaction "${transaction.description}" uses a ${category.kind} category for ${transaction.type}.`,
        );
      }
    }
    if (transaction.billId && !billIds.has(transaction.billId)) {
      errors.push(`Transaction "${transaction.description}" references a missing bill.`);
    }
    if (transaction.incomeSourceId && !incomeSourceIds.has(transaction.incomeSourceId)) {
      errors.push(`Transaction "${transaction.description}" references a missing income source.`);
    }
    if (transaction.debtId && !debtIds.has(transaction.debtId)) {
      errors.push(`Transaction "${transaction.description}" references a missing debt.`);
    }
    if (transaction.billOccurrenceId) {
      if (!occurrenceIds.has(transaction.billOccurrenceId)) {
        errors.push(
          `Transaction "${transaction.description}" references a missing bill occurrence.`,
        );
      } else {
        const occurrence = occurrenceById.get(transaction.billOccurrenceId)!;
        if (occurrence.paidTransactionId !== transaction.id) {
          errors.push(
            `Bill occurrence ${occurrence.id} and transaction ${transaction.id} are not linked consistently.`,
          );
        }
        if (transaction.billId !== occurrence.billId) {
          errors.push(`Transaction "${transaction.description}" has a mismatched bill id.`);
        }
        if (transaction.status !== 'cleared') {
          errors.push(`A bill payment transaction must be cleared.`);
        }
      }
    }
    if (transaction.source === 'bill' && !transaction.billOccurrenceId) {
      errors.push(
        `Transaction "${transaction.description}" is a bill payment without an occurrence.`,
      );
    }
  }

  for (const occurrence of payload.billOccurrences) {
    if (occurrence.paidTransactionId) {
      const transaction = transactionById.get(occurrence.paidTransactionId);
      if (!transaction) {
        errors.push(`Occurrence ${occurrence.id} references a missing transaction.`);
      } else if (transaction.billOccurrenceId !== occurrence.id) {
        errors.push(`Occurrence ${occurrence.id} and its transaction are not linked consistently.`);
      }
    }
  }

  for (const entry of payload.savingsEntries) {
    if (!goalIds.has(entry.goalId)) {
      errors.push(`Savings entry ${entry.id} references a missing goal.`);
    }
  }

  return errors;
}

export function validateBackupInput(input: unknown, rawSize = 0): BackupValidationResult {
  if (rawSize > MAX_BACKUP_BYTES) {
    return {
      ok: false,
      errors: ['This backup is larger than 15 MB. Tide does not import files of that size.'],
    };
  }
  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.slice(0, 8).map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'backup';
      return `${path}: ${issue.message}`;
    });
    return { ok: false, errors };
  }
  const relationshipErrors = validateRelationships(parsed.data.data);
  if (relationshipErrors.length > 0) {
    return { ok: false, errors: relationshipErrors.slice(0, 12) };
  }
  const counts = countPayload(parsed.data.data);
  const totalRecords = Object.values(counts).reduce((total, value) => total + value, 0);
  return {
    ok: true,
    backup: parsed.data,
    summary: {
      exportedAt: parsed.data.exportedAt,
      appVersion: parsed.data.appVersion,
      counts,
      totalRecords,
    },
  };
}

export function parseBackupText(text: string): BackupValidationResult {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    return {
      ok: false,
      errors: ['This backup is larger than 15 MB. Tide does not import files of that size.'],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['This file is not valid JSON.'] };
  }
  return validateBackupInput(parsed);
}

export function emptyBackupPayload(settings: BackupPayload['settings']): BackupPayload {
  return {
    settings,
    categories: [],
    incomeSources: [],
    bills: [],
    billOccurrences: [],
    transactions: [],
    debts: [],
    savingsGoals: [],
    savingsEntries: [],
  };
}

export function transactionCountByCategory(
  transactions: Transaction[],
  categories: Category[],
): number {
  return transactions.filter((transaction) =>
    categories.some((category) => category.id === transaction.categoryId),
  ).length;
}
