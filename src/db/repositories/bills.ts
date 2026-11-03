import type { Bill, BillFrequency, BillOccurrence, DateOnly, Transaction } from '@/domain/types';
import { billOccurrenceSchema, billSchema } from '@/domain/schemas';
import type { HarborDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { createId, nowIso } from '@/lib/ids';
import { addMonthsClamped, isValidDateOnly, todayISO } from '@/lib/dates';
import { occurrenceDatesInRange } from '@/lib/recurrence';

export interface BillInput {
  name: string;
  amountMinor: number;
  frequency: BillFrequency;
  anchorDate: DateOnly;
  endDate: DateOnly | null;
  secondDay?: number | null;
  categoryId: string | null;
  accountId?: string | null;
  autoPay: boolean;
  notes?: string;
}

export function occurrenceId(billId: string, dueDate: DateOnly): string {
  return `${billId}__${dueDate}`;
}

function horizon(today: DateOnly): { start: DateOnly; end: DateOnly } {
  return {
    start: addMonthsClamped(today, -18),
    end: addMonthsClamped(today, 24),
  };
}

function validate(input: BillInput, bills: Bill[] = [], ignoreId?: string): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Name is required.');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    errors.push('Enter an amount greater than zero.');
  }
  if (!isValidDateOnly(input.anchorDate)) errors.push('Choose a valid first due date.');
  if (input.endDate && !isValidDateOnly(input.endDate)) errors.push('Choose a valid end date.');
  if (input.endDate && input.endDate < input.anchorDate) {
    errors.push('The end date cannot be before the first due date.');
  }
  if (
    input.frequency === 'semimonthly' &&
    input.secondDay !== undefined &&
    input.secondDay !== null &&
    (!Number.isInteger(input.secondDay) || input.secondDay < 2 || input.secondDay > 31)
  ) {
    errors.push('Choose a second due day between 2 and 31.');
  }
  const duplicate = bills.find(
    (bill) =>
      bill.id !== ignoreId &&
      bill.active &&
      bill.name.trim().toLocaleLowerCase() === input.name.trim().toLocaleLowerCase(),
  );
  if (duplicate) errors.push('You already have an active bill with this name.');
  return errors;
}

function datesForBill(bill: Bill, from: DateOnly, to: DateOnly): DateOnly[] {
  return occurrenceDatesInRange(
    {
      frequency: bill.frequency,
      anchorDate: bill.anchorDate,
      endDate: bill.endDate,
      secondDay: bill.secondDay,
    },
    from,
    to,
  );
}

function secondDayFor(input: BillInput): number | null {
  return input.frequency === 'semimonthly' ? (input.secondDay ?? 15) : null;
}

export function createBillsRepository(database: HarborDatabase, clock: () => DateOnly = todayISO) {
  async function validateAccount(accountId: string | null | undefined): Promise<void> {
    if (!accountId) return;
    const account = await database.accounts.get(accountId);
    if (!account) throw new AppError('VALIDATION', 'That account is no longer available.');
  }

  return {
    async list(): Promise<Bill[]> {
      const rows = await database.bills.toArray();
      return rows.sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.anchorDate.localeCompare(b.anchorDate) || a.name.localeCompare(b.name);
      });
    },

    async listOccurrences(from: DateOnly, to: DateOnly): Promise<BillOccurrence[]> {
      const rows = await database.billOccurrences
        .where('dueDate')
        .between(from, to, true, true)
        .toArray();
      return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    },

    async ensureOccurrences(from: DateOnly, to: DateOnly): Promise<number> {
      const bills = await database.bills.filter((bill) => bill.active).toArray();
      let created = 0;
      await database.transaction('rw', database.bills, database.billOccurrences, async () => {
        for (const bill of bills) {
          const dates = datesForBill(bill, from, to);
          if (dates.length === 0) continue;
          const existing = await database.billOccurrences.where('billId').equals(bill.id).toArray();
          const existingIds = new Set(existing.map((occurrence) => occurrence.id));
          const now = nowIso();
          const missing: BillOccurrence[] = [];
          for (const date of dates) {
            const id = occurrenceId(bill.id, date);
            if (existingIds.has(id)) continue;
            const occurrence: BillOccurrence = {
              id,
              billId: bill.id,
              dueDate: date,
              amountMinor: bill.amountMinor,
              status: 'unpaid',
              paidTransactionId: null,
              paidAt: null,
              skippedAt: null,
              sample: bill.sample,
              createdAt: now,
              updatedAt: now,
            };
            const parsed = billOccurrenceSchema.safeParse(occurrence);
            if (!parsed.success) {
              throw new AppError(
                'VALIDATION',
                `Harbor could not create a due date for “${bill.name}”.`,
                parsed.error.issues.map((issue) => issue.message),
              );
            }
            missing.push(parsed.data);
          }
          if (missing.length > 0) {
            await database.billOccurrences.bulkPut(missing);
            created += missing.length;
          }
        }
      });
      return created;
    },

    async create(input: BillInput): Promise<Bill> {
      const existing = await database.bills.toArray();
      const errors = validate(input, existing);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      await validateAccount(input.accountId);
      const now = nowIso();
      const bill: Bill = {
        id: createId('bill'),
        name: input.name.trim(),
        amountMinor: input.amountMinor,
        frequency: input.frequency,
        anchorDate: input.anchorDate,
        endDate: input.endDate || null,
        secondDay: secondDayFor(input),
        categoryId: input.categoryId,
        accountId: input.accountId ?? null,
        autoPay: input.autoPay,
        notes: input.notes?.trim() ?? '',
        active: true,
        sample: false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = billSchema.safeParse(bill);
      if (!parsed.success) {
        throw new AppError(
          'VALIDATION',
          'That bill could not be saved.',
          parsed.error.issues.map((issue) => issue.message),
        );
      }
      const today = clock();
      const range = horizon(today);
      await database.transaction('rw', database.bills, database.billOccurrences, async () => {
        await database.bills.add(parsed.data);
        const dates = datesForBill(parsed.data, range.start, range.end);
        const occurrences = dates.map((date) => {
          const occurrence: BillOccurrence = {
            id: occurrenceId(parsed.data.id, date),
            billId: parsed.data.id,
            dueDate: date,
            amountMinor: parsed.data.amountMinor,
            status: 'unpaid',
            paidTransactionId: null,
            paidAt: null,
            skippedAt: null,
            sample: parsed.data.sample,
            createdAt: now,
            updatedAt: now,
          };
          return occurrence;
        });
        if (occurrences.length > 0) await database.billOccurrences.bulkPut(occurrences);
      });
      return parsed.data;
    },

    /**
     * Future unpaid occurrences from `effectiveFrom` are regenerated. Paid and
     * skipped occurrences are preserved, as are past unpaid occurrences.
     */
    async update(id: string, input: BillInput, effectiveFrom: DateOnly = clock()): Promise<Bill> {
      const current = await database.bills.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That bill is no longer here.');
      const existing = await database.bills.toArray();
      const errors = validate(input, existing, id);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      await validateAccount(input.accountId);
      const next: Bill = {
        ...current,
        name: input.name.trim(),
        amountMinor: input.amountMinor,
        frequency: input.frequency,
        anchorDate: input.anchorDate,
        endDate: input.endDate || null,
        secondDay: secondDayFor(input),
        categoryId: input.categoryId,
        accountId: input.accountId ?? null,
        autoPay: input.autoPay,
        notes: input.notes?.trim() ?? '',
        updatedAt: nowIso(),
      };
      const parsed = billSchema.safeParse(next);
      if (!parsed.success) {
        throw new AppError(
          'VALIDATION',
          'That bill could not be saved.',
          parsed.error.issues.map((issue) => issue.message),
        );
      }
      const today = clock();
      const range = horizon(today);
      await database.transaction('rw', database.bills, database.billOccurrences, async () => {
        const all = await database.billOccurrences.where('billId').equals(id).toArray();
        const protectedIds = new Set(
          all
            .filter((occurrence) => occurrence.status !== 'unpaid')
            .map((occurrence) => occurrence.id),
        );
        const toDelete = all
          .filter(
            (occurrence) => occurrence.status === 'unpaid' && occurrence.dueDate >= effectiveFrom,
          )
          .map((occurrence) => occurrence.id);
        if (toDelete.length > 0) await database.billOccurrences.bulkDelete(toDelete);
        await database.bills.put(parsed.data);
        const dates = datesForBill(parsed.data, effectiveFrom, range.end);
        const now = nowIso();
        const additions: BillOccurrence[] = [];
        for (const date of dates) {
          const oid = occurrenceId(id, date);
          if (protectedIds.has(oid)) continue;
          additions.push({
            id: oid,
            billId: id,
            dueDate: date,
            amountMinor: parsed.data.amountMinor,
            status: 'unpaid',
            paidTransactionId: null,
            paidAt: null,
            skippedAt: null,
            sample: parsed.data.sample,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (additions.length > 0) await database.billOccurrences.bulkPut(additions);
      });
      return parsed.data;
    },

    async archive(id: string): Promise<void> {
      const current = await database.bills.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That bill is no longer here.');
      const today = clock();
      await database.transaction('rw', database.bills, database.billOccurrences, async () => {
        await database.bills.update(id, { active: false, updatedAt: nowIso() });
        const futureUnpaid = await database.billOccurrences
          .where('billId')
          .equals(id)
          .filter((occurrence) => occurrence.status === 'unpaid' && occurrence.dueDate >= today)
          .toArray();
        if (futureUnpaid.length > 0) {
          await database.billOccurrences.bulkDelete(
            futureUnpaid.map((occurrence) => occurrence.id),
          );
        }
      });
    },

    async restore(id: string): Promise<void> {
      const current = await database.bills.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That bill is no longer here.');
      if (current.active) return;
      const today = clock();
      const range = horizon(today);
      await database.transaction('rw', database.bills, database.billOccurrences, async () => {
        const restored = { ...current, active: true, updatedAt: nowIso() };
        const parsed = billSchema.safeParse(restored);
        if (!parsed.success) throw new AppError('VALIDATION', 'That bill could not be restored.');
        await database.bills.put(parsed.data);
        const dates = datesForBill(parsed.data, today, range.end);
        const existing = await database.billOccurrences.where('billId').equals(id).toArray();
        const existingIds = new Set(existing.map((occurrence) => occurrence.id));
        const now = nowIso();
        const additions: BillOccurrence[] = [];
        for (const date of dates) {
          const oid = occurrenceId(id, date);
          if (existingIds.has(oid)) continue;
          additions.push({
            id: oid,
            billId: id,
            dueDate: date,
            amountMinor: parsed.data.amountMinor,
            status: 'unpaid',
            paidTransactionId: null,
            paidAt: null,
            skippedAt: null,
            sample: parsed.data.sample,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (additions.length > 0) await database.billOccurrences.bulkPut(additions);
      });
    },

    async markPaid(
      billOccurrenceId: string,
      paidDate: DateOnly = clock(),
    ): Promise<{ occurrence: BillOccurrence; transaction: Transaction }> {
      if (!isValidDateOnly(paidDate)) {
        throw new AppError('VALIDATION', 'Choose a valid payment date.');
      }
      return database.transaction(
        'rw',
        database.bills,
        database.billOccurrences,
        database.transactions,
        async () => {
          const occurrence = await database.billOccurrences.get(billOccurrenceId);
          if (!occurrence) {
            throw new AppError('NOT_FOUND', 'That bill occurrence is no longer here.');
          }
          if (occurrence.status === 'paid') {
            throw new AppError('CONFLICT', 'This bill is already marked paid.');
          }
          if (occurrence.status === 'skipped') {
            throw new AppError('CONFLICT', 'Restore this skipped bill before marking it paid.');
          }
          const existingLink = await database.transactions
            .where('billOccurrenceId')
            .equals(billOccurrenceId)
            .first();
          if (existingLink) {
            throw new AppError('CONFLICT', 'A payment already exists for this bill occurrence.');
          }
          const bill = await database.bills.get(occurrence.billId);
          if (!bill) {
            throw new AppError('NOT_FOUND', 'The bill for this occurrence is no longer here.');
          }
          const now = nowIso();
          const transaction: Transaction = {
            id: createId('tx'),
            type: 'expense',
            amountMinor: occurrence.amountMinor,
            date: paidDate,
            description: bill.name,
            categoryId: bill.categoryId,
            notes: '',
            status: 'cleared',
            source: 'bill',
            billId: bill.id,
            billOccurrenceId: occurrence.id,
            debtId: null,
            incomeSourceId: null,
            accountId: bill.accountId ?? null,
            sample: occurrence.sample || bill.sample,
            createdAt: now,
            updatedAt: now,
          };
          await database.transactions.add(transaction);
          const nextOccurrence: BillOccurrence = {
            ...occurrence,
            status: 'paid',
            paidTransactionId: transaction.id,
            paidAt: paidDate,
            skippedAt: null,
            updatedAt: now,
          };
          const parsed = billOccurrenceSchema.safeParse(nextOccurrence);
          if (!parsed.success) {
            throw new AppError('VALIDATION', 'That payment could not be recorded.');
          }
          await database.billOccurrences.put(parsed.data);
          return { occurrence: parsed.data, transaction };
        },
      );
    },

    async markUnpaid(billOccurrenceId: string): Promise<BillOccurrence> {
      return database.transaction(
        'rw',
        database.billOccurrences,
        database.transactions,
        async () => {
          const occurrence = await database.billOccurrences.get(billOccurrenceId);
          if (!occurrence) {
            throw new AppError('NOT_FOUND', 'That bill occurrence is no longer here.');
          }
          if (occurrence.paidTransactionId) {
            await database.transactions.delete(occurrence.paidTransactionId);
          }
          const next: BillOccurrence = {
            ...occurrence,
            status: 'unpaid',
            paidTransactionId: null,
            paidAt: null,
            skippedAt: null,
            updatedAt: nowIso(),
          };
          await database.billOccurrences.put(next);
          return next;
        },
      );
    },

    async skip(billOccurrenceId: string): Promise<BillOccurrence> {
      const occurrence = await database.billOccurrences.get(billOccurrenceId);
      if (!occurrence) throw new AppError('NOT_FOUND', 'That bill occurrence is no longer here.');
      if (occurrence.status === 'paid') {
        throw new AppError('CONFLICT', 'Mark this bill unpaid before skipping it.');
      }
      const next: BillOccurrence = {
        ...occurrence,
        status: 'skipped',
        skippedAt: nowIso(),
        updatedAt: nowIso(),
      };
      await database.billOccurrences.put(next);
      return next;
    },

    async unskip(billOccurrenceId: string): Promise<BillOccurrence> {
      const occurrence = await database.billOccurrences.get(billOccurrenceId);
      if (!occurrence) throw new AppError('NOT_FOUND', 'That bill occurrence is no longer here.');
      const next: BillOccurrence = {
        ...occurrence,
        status: 'unpaid',
        skippedAt: null,
        updatedAt: nowIso(),
      };
      await database.billOccurrences.put(next);
      return next;
    },

    async paymentHistory(billId: string): Promise<Transaction[]> {
      return database.transactions
        .where('billId')
        .equals(billId)
        .filter((transaction) => Boolean(transaction.billOccurrenceId))
        .reverse()
        .sortBy('date');
    },
  };
}

export type BillsRepository = ReturnType<typeof createBillsRepository>;
