import type { SavingsEntry, SavingsGoal } from '@/domain/types';
import { savingsEntrySchema, savingsGoalSchema } from '@/domain/schemas';
import type { TideDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { createId, nowIso } from '@/lib/ids';
import { isValidDateOnly } from '@/lib/dates';

export interface SavingsGoalInput {
  name: string;
  targetMinor: number;
  startingMinor: number;
  targetDate: string | null;
  color: string;
  notes?: string;
}

function validate(input: SavingsGoalInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Name is required.');
  if (!Number.isSafeInteger(input.targetMinor) || input.targetMinor <= 0) {
    errors.push('Enter a target greater than zero.');
  }
  if (!Number.isSafeInteger(input.startingMinor) || input.startingMinor < 0) {
    errors.push('Enter a valid starting amount.');
  }
  if (input.targetDate && !isValidDateOnly(input.targetDate)) {
    errors.push('Choose a valid target date.');
  }
  return errors;
}

export function createSavingsRepository(database: TideDatabase) {
  return {
    async listGoals(): Promise<SavingsGoal[]> {
      const rows = await database.savingsGoals.toArray();
      return rows.sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
    },

    async listEntries(goalId?: string): Promise<SavingsEntry[]> {
      const rows = goalId
        ? await database.savingsEntries.where('goalId').equals(goalId).toArray()
        : await database.savingsEntries.toArray();
      return rows.sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      );
    },

    async createGoal(input: SavingsGoalInput): Promise<SavingsGoal> {
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const now = nowIso();
      const goal: SavingsGoal = {
        id: createId('goal'),
        name: input.name.trim(),
        targetMinor: input.targetMinor,
        startingMinor: input.startingMinor,
        targetDate: input.targetDate || null,
        color: input.color,
        notes: input.notes?.trim() ?? '',
        archived: false,
        sample: false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = savingsGoalSchema.safeParse(goal);
      if (!parsed.success) throw new AppError('VALIDATION', 'That goal could not be saved.');
      await database.savingsGoals.add(parsed.data);
      return parsed.data;
    },

    async updateGoal(id: string, input: SavingsGoalInput): Promise<SavingsGoal> {
      const current = await database.savingsGoals.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That goal is no longer here.');
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const next: SavingsGoal = {
        ...current,
        name: input.name.trim(),
        targetMinor: input.targetMinor,
        startingMinor: input.startingMinor,
        targetDate: input.targetDate || null,
        color: input.color,
        notes: input.notes?.trim() ?? '',
        updatedAt: nowIso(),
      };
      const parsed = savingsGoalSchema.safeParse(next);
      if (!parsed.success) throw new AppError('VALIDATION', 'That goal could not be saved.');
      await database.savingsGoals.put(parsed.data);
      return parsed.data;
    },

    async archiveGoal(id: string): Promise<void> {
      const current = await database.savingsGoals.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That goal is no longer here.');
      await database.savingsGoals.update(id, { archived: true, updatedAt: nowIso() });
    },

    async restoreGoal(id: string): Promise<void> {
      const current = await database.savingsGoals.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That goal is no longer here.');
      await database.savingsGoals.update(id, { archived: false, updatedAt: nowIso() });
    },

    async addEntry(
      goalId: string,
      amountMinor: number,
      date: string,
      note = '',
    ): Promise<SavingsEntry> {
      if (!Number.isSafeInteger(amountMinor) || amountMinor === 0) {
        throw new AppError('VALIDATION', 'Enter an amount greater than zero.');
      }
      if (!isValidDateOnly(date)) throw new AppError('VALIDATION', 'Choose a valid date.');
      const goal = await database.savingsGoals.get(goalId);
      if (!goal) throw new AppError('NOT_FOUND', 'That goal is no longer here.');
      if (goal.archived) throw new AppError('CONFLICT', 'Restore this goal before adding money.');
      const now = nowIso();
      const entry: SavingsEntry = {
        id: createId('sav'),
        goalId,
        amountMinor,
        date,
        note: note.trim(),
        sample: goal.sample,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = savingsEntrySchema.safeParse(entry);
      if (!parsed.success) {
        throw new AppError(
          'VALIDATION',
          'That savings entry could not be saved.',
          parsed.error.issues.map((issue) => issue.message),
        );
      }
      await database.savingsEntries.add(parsed.data);
      return parsed.data;
    },

    async deleteEntry(id: string): Promise<SavingsEntry> {
      const entry = await database.savingsEntries.get(id);
      if (!entry) throw new AppError('NOT_FOUND', 'That savings entry is no longer here.');
      await database.savingsEntries.delete(id);
      return entry;
    },
  };
}

export type SavingsRepository = ReturnType<typeof createSavingsRepository>;
