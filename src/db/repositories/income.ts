import type { IncomeFrequency, IncomeSource } from '@/domain/types';
import { incomeSourceSchema } from '@/domain/schemas';
import type { TideDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { createId, nowIso } from '@/lib/ids';
import { isValidDateOnly, todayISO } from '@/lib/dates';

export interface IncomeSourceInput {
  name: string;
  amountMinor: number;
  frequency: IncomeFrequency;
  anchorDate: string;
  endDate: string | null;
  notes?: string;
}

export function createIncomeRepository(database: TideDatabase) {
  function validate(input: IncomeSourceInput): string[] {
    const errors: string[] = [];
    if (!input.name.trim()) errors.push('Name is required.');
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0) {
      errors.push('Enter a valid expected amount.');
    }
    if (!isValidDateOnly(input.anchorDate)) errors.push('Choose a valid first payday.');
    if (input.endDate && !isValidDateOnly(input.endDate)) errors.push('Choose a valid end date.');
    if (input.endDate && input.endDate < input.anchorDate) {
      errors.push('The end date cannot be before the first payday.');
    }
    return errors;
  }

  return {
    async list(): Promise<IncomeSource[]> {
      const rows = await database.incomeSources.toArray();
      return rows.sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.anchorDate.localeCompare(b.anchorDate) || a.name.localeCompare(b.name);
      });
    },

    async create(input: IncomeSourceInput): Promise<IncomeSource> {
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const now = nowIso();
      const source: IncomeSource = {
        id: createId('inc'),
        name: input.name.trim(),
        amountMinor: input.amountMinor,
        frequency: input.frequency,
        anchorDate: input.anchorDate,
        endDate: input.endDate || null,
        active: true,
        notes: input.notes?.trim() ?? '',
        sample: false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = incomeSourceSchema.safeParse(source);
      if (!parsed.success) {
        throw new AppError(
          'VALIDATION',
          'That income source could not be saved.',
          parsed.error.issues.map((issue) => issue.message),
        );
      }
      await database.incomeSources.add(parsed.data);
      return parsed.data;
    },

    async update(id: string, input: IncomeSourceInput): Promise<IncomeSource> {
      const current = await database.incomeSources.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That income source is no longer here.');
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const next: IncomeSource = {
        ...current,
        name: input.name.trim(),
        amountMinor: input.amountMinor,
        frequency: input.frequency,
        anchorDate: input.anchorDate,
        endDate: input.endDate || null,
        notes: input.notes?.trim() ?? '',
        updatedAt: nowIso(),
      };
      const parsed = incomeSourceSchema.safeParse(next);
      if (!parsed.success) {
        throw new AppError(
          'VALIDATION',
          'That income source could not be saved.',
          parsed.error.issues.map((issue) => issue.message),
        );
      }
      await database.incomeSources.put(parsed.data);
      return parsed.data;
    },

    async setActive(id: string, active: boolean): Promise<IncomeSource> {
      const current = await database.incomeSources.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That income source is no longer here.');
      const next = { ...current, active, updatedAt: nowIso() };
      const parsed = incomeSourceSchema.safeParse(next);
      if (!parsed.success) throw new AppError('VALIDATION', 'That change could not be saved.');
      await database.incomeSources.put(parsed.data);
      return parsed.data;
    },

    async remove(id: string): Promise<void> {
      const current = await database.incomeSources.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That income source is no longer here.');
      const linked = await database.transactions.where('incomeSourceId').equals(id).count();
      if (linked > 0) {
        await database.incomeSources.update(id, {
          active: false,
          endDate: todayISO(),
          updatedAt: nowIso(),
        });
        return;
      }
      await database.incomeSources.delete(id);
    },
  };
}

export type IncomeRepository = ReturnType<typeof createIncomeRepository>;
