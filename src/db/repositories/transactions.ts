import type {
  Transaction,
  TransactionSource,
  TransactionStatus,
  TransactionType,
} from '@/domain/types';
import { transactionSchema } from '@/domain/schemas';
import type { TideDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { createId, nowIso } from '@/lib/ids';
import { isValidDateOnly } from '@/lib/dates';

export interface TransactionInput {
  type: TransactionType;
  amountMinor: number;
  date: string;
  description: string;
  categoryId: string | null;
  notes?: string;
  status: TransactionStatus;
  source?: TransactionSource;
  billId?: string | null;
  billOccurrenceId?: string | null;
  debtId?: string | null;
  incomeSourceId?: string | null;
  sample?: boolean;
}

export function createTransactionsRepository(database: TideDatabase) {
  async function validateLinks(
    input: TransactionInput,
    allowBillOccurrence = false,
  ): Promise<void> {
    if (input.billOccurrenceId && !allowBillOccurrence) {
      throw new AppError(
        'CONFLICT',
        'Bill payments are recorded from the bill itself so the two stay in sync.',
      );
    }
    if (input.categoryId) {
      const category = await database.categories.get(input.categoryId);
      if (!category) throw new AppError('VALIDATION', 'That category is no longer available.');
      if (category.kind !== input.type) {
        throw new AppError('VALIDATION', `Choose a ${input.type} category for this ${input.type}.`);
      }
    }
    if (input.debtId) {
      if (input.type !== 'expense') {
        throw new AppError('VALIDATION', 'A debt payment must be an expense.');
      }
      const debt = await database.debts.get(input.debtId);
      if (!debt) throw new AppError('VALIDATION', 'That debt is no longer available.');
    }
    if (input.incomeSourceId) {
      if (input.type !== 'income') {
        throw new AppError('VALIDATION', 'A received payday must be income.');
      }
      const source = await database.incomeSources.get(input.incomeSourceId);
      if (!source) throw new AppError('VALIDATION', 'That income source is no longer available.');
    }
  }

  function validateFields(input: TransactionInput): void {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new AppError('VALIDATION', 'Enter an amount greater than zero.');
    }
    if (!isValidDateOnly(input.date)) throw new AppError('VALIDATION', 'Choose a valid date.');
    if (!input.description.trim()) {
      throw new AppError('VALIDATION', 'Add a short description.');
    }
    if (input.description.trim().length > 120) {
      throw new AppError('VALIDATION', 'Keep the description under 120 characters.');
    }
  }

  return {
    async list(): Promise<Transaction[]> {
      const rows = await database.transactions.toArray();
      return rows.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });
    },

    async get(id: string): Promise<Transaction | null> {
      return (await database.transactions.get(id)) ?? null;
    },

    async create(input: TransactionInput): Promise<Transaction> {
      validateFields(input);
      await validateLinks(input);
      const now = nowIso();
      const id = createId(input.sample ? 'sample-tx' : 'tx');
      const transaction: Transaction = {
        id,
        type: input.type,
        amountMinor: input.amountMinor,
        date: input.date,
        description: input.description.trim(),
        categoryId: input.categoryId,
        notes: input.notes?.trim() ?? '',
        status: input.status,
        source: input.source ?? 'manual',
        billId: input.billId ?? null,
        billOccurrenceId: input.billOccurrenceId ?? null,
        debtId: input.debtId ?? null,
        incomeSourceId: input.incomeSourceId ?? null,
        sample: input.sample ?? false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = transactionSchema.safeParse(transaction);
      if (!parsed.success) {
        throw new AppError(
          'VALIDATION',
          'That transaction could not be saved.',
          parsed.error.issues.map((issue) => issue.message),
        );
      }
      await database.transactions.add(parsed.data);
      return parsed.data;
    },

    async update(id: string, input: TransactionInput): Promise<Transaction> {
      const current = await database.transactions.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That transaction is no longer here.');
      validateFields(input);
      if (input.billOccurrenceId && input.billOccurrenceId !== current.billOccurrenceId) {
        throw new AppError(
          'CONFLICT',
          'A transaction cannot be moved to a different bill payment.',
        );
      }
      await validateLinks(input, true);

      if (current.billOccurrenceId) {
        const immutable =
          current.type !== input.type ||
          current.amountMinor !== input.amountMinor ||
          current.date !== input.date ||
          current.status !== input.status ||
          current.categoryId !== input.categoryId;
        if (immutable) {
          throw new AppError(
            'CONFLICT',
            'To change this bill payment, mark the bill unpaid first. That keeps the bill and your spending in sync.',
          );
        }
      }
      if (current.debtId && input.type !== 'expense') {
        throw new AppError('CONFLICT', 'A debt payment must stay an expense.');
      }
      if (current.incomeSourceId && input.type !== 'income') {
        throw new AppError('CONFLICT', 'A received payday must stay income.');
      }

      const next: Transaction = {
        ...current,
        type: input.type,
        amountMinor: input.amountMinor,
        date: input.date,
        description: input.description.trim(),
        categoryId: input.categoryId,
        notes: input.notes?.trim() ?? '',
        status: input.status,
        updatedAt: nowIso(),
      };
      const parsed = transactionSchema.safeParse(next);
      if (!parsed.success) {
        throw new AppError(
          'VALIDATION',
          'That transaction could not be saved.',
          parsed.error.issues.map((issue) => issue.message),
        );
      }
      await database.transactions.put(parsed.data);
      return parsed.data;
    },

    async setStatus(id: string, status: TransactionStatus): Promise<Transaction> {
      const current = await database.transactions.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That transaction is no longer here.');
      if (current.billOccurrenceId) {
        throw new AppError('CONFLICT', 'A bill payment is always cleared.');
      }
      const next = { ...current, status, updatedAt: nowIso() };
      await database.transactions.put(next);
      return next;
    },

    async delete(id: string): Promise<Transaction> {
      const current = await database.transactions.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That transaction is no longer here.');
      if (current.billOccurrenceId) {
        throw new AppError(
          'CONFLICT',
          'This is a bill payment. Mark the bill unpaid first so the bill stays accurate.',
        );
      }
      await database.transactions.delete(id);
      return current;
    },

    async restore(transaction: Transaction): Promise<Transaction> {
      const existing = await database.transactions.get(transaction.id);
      if (existing) throw new AppError('CONFLICT', 'That transaction already exists.');
      const parsed = transactionSchema.safeParse(transaction);
      if (!parsed.success)
        throw new AppError('VALIDATION', 'That transaction could not be restored.');
      await database.transactions.add(parsed.data);
      return parsed.data;
    },
  };
}

export type TransactionsRepository = ReturnType<typeof createTransactionsRepository>;
