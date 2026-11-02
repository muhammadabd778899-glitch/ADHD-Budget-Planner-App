import type { Debt, DebtKind, Transaction } from '@/domain/types';
import { debtSchema } from '@/domain/schemas';
import type { TideDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { createId, nowIso } from '@/lib/ids';
import { isValidDateOnly, todayISO } from '@/lib/dates';

export interface DebtInput {
  name: string;
  kind: DebtKind;
  balanceMinor: number;
  interestRateBps: number | null;
  minimumPaymentMinor: number | null;
  targetPayoffDate: string | null;
  notes?: string;
}

function validate(input: DebtInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Name is required.');
  if (!Number.isSafeInteger(input.balanceMinor) || input.balanceMinor < 0) {
    errors.push('Enter a valid balance.');
  }
  if (
    input.interestRateBps !== null &&
    (!Number.isInteger(input.interestRateBps) ||
      input.interestRateBps < 0 ||
      input.interestRateBps > 10_000)
  ) {
    errors.push('Enter an interest rate between 0 and 100%.');
  }
  if (
    input.minimumPaymentMinor !== null &&
    (!Number.isSafeInteger(input.minimumPaymentMinor) || input.minimumPaymentMinor < 0)
  ) {
    errors.push('Enter a valid minimum payment.');
  }
  if (input.targetPayoffDate && !isValidDateOnly(input.targetPayoffDate)) {
    errors.push('Choose a valid target date.');
  }
  return errors;
}

export function createDebtsRepository(database: TideDatabase) {
  return {
    async list(): Promise<Debt[]> {
      const rows = await database.debts.toArray();
      return rows.sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
    },

    async create(input: DebtInput): Promise<Debt> {
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const now = nowIso();
      const debt: Debt = {
        id: createId('debt'),
        name: input.name.trim(),
        kind: input.kind,
        balanceMinor: input.balanceMinor,
        interestRateBps: input.interestRateBps,
        minimumPaymentMinor: input.minimumPaymentMinor,
        targetPayoffDate: input.targetPayoffDate || null,
        notes: input.notes?.trim() ?? '',
        archived: false,
        sample: false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = debtSchema.safeParse(debt);
      if (!parsed.success) {
        throw new AppError('VALIDATION', 'That debt could not be saved.');
      }
      await database.debts.add(parsed.data);
      return parsed.data;
    },

    async update(id: string, input: DebtInput): Promise<Debt> {
      const current = await database.debts.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That debt is no longer here.');
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const next: Debt = {
        ...current,
        name: input.name.trim(),
        kind: input.kind,
        balanceMinor: input.balanceMinor,
        interestRateBps: input.interestRateBps,
        minimumPaymentMinor: input.minimumPaymentMinor,
        targetPayoffDate: input.targetPayoffDate || null,
        notes: input.notes?.trim() ?? '',
        updatedAt: nowIso(),
      };
      const parsed = debtSchema.safeParse(next);
      if (!parsed.success) throw new AppError('VALIDATION', 'That debt could not be saved.');
      await database.debts.put(parsed.data);
      return parsed.data;
    },

    async archive(id: string): Promise<void> {
      const current = await database.debts.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That debt is no longer here.');
      await database.debts.update(id, { archived: true, updatedAt: nowIso() });
    },

    async restore(id: string): Promise<void> {
      const current = await database.debts.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That debt is no longer here.');
      await database.debts.update(id, { archived: false, updatedAt: nowIso() });
    },

    async recordPayment(
      debtId: string,
      amountMinor: number,
      date: string = todayISO(),
      note = '',
    ): Promise<Transaction> {
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw new AppError('VALIDATION', 'Enter a payment greater than zero.');
      }
      if (!isValidDateOnly(date)) throw new AppError('VALIDATION', 'Choose a valid payment date.');
      return database.transaction('rw', database.debts, database.transactions, async () => {
        const debt = await database.debts.get(debtId);
        if (!debt) throw new AppError('NOT_FOUND', 'That debt is no longer here.');
        if (debt.archived)
          throw new AppError('CONFLICT', 'Restore this debt before recording a payment.');
        const now = nowIso();
        const category = await database.categories.get('cat-debt');
        const categoryId = category && category.kind === 'expense' ? category.id : null;
        const transaction: Transaction = {
          id: createId('tx'),
          type: 'expense',
          amountMinor,
          date,
          description: `Payment — ${debt.name}`,
          categoryId,
          notes: note.trim(),
          status: 'cleared',
          source: 'debt',
          billId: null,
          billOccurrenceId: null,
          debtId: debt.id,
          incomeSourceId: null,
          sample: debt.sample,
          createdAt: now,
          updatedAt: now,
        };
        await database.transactions.add(transaction);
        return transaction;
      });
    },

    async payments(debtId: string): Promise<Transaction[]> {
      const rows = await database.transactions.where('debtId').equals(debtId).toArray();
      return rows
        .filter((transaction) => transaction.type === 'expense')
        .sort((a, b) => b.date.localeCompare(a.date));
    },
  };
}

export type DebtsRepository = ReturnType<typeof createDebtsRepository>;
