import type { Envelope } from '@/domain/types';
import { envelopeSchema } from '@/domain/schemas';
import type { HarborDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { createId, nowIso } from '@/lib/ids';
import { monthKey, todayISO } from '@/lib/dates';

export interface EnvelopeInput {
  name: string;
  categoryId: string;
  monthlyAmountMinor: number;
  rollover: boolean;
}

export function createEnvelopesRepository(
  database: HarborDatabase,
  clock: () => string = todayISO,
) {
  async function validate(input: EnvelopeInput, ignoreId?: string): Promise<string[]> {
    const errors: string[] = [];
    if (!input.name.trim()) errors.push('Name is required.');
    if (!Number.isSafeInteger(input.monthlyAmountMinor) || input.monthlyAmountMinor <= 0) {
      errors.push('Enter a monthly amount greater than zero.');
    }
    const category = await database.categories.get(input.categoryId);
    if (!category) errors.push('Choose an active expense category.');
    else if (category.kind !== 'expense') errors.push('Envelopes use expense categories.');
    const duplicate = await database.envelopes
      .where('categoryId')
      .equals(input.categoryId)
      .filter((row) => !row.archived && row.id !== ignoreId)
      .first();
    if (duplicate) errors.push('That category already has an envelope.');
    return errors;
  }

  return {
    async list(): Promise<Envelope[]> {
      const rows = await database.envelopes.toArray();
      return rows.sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
    },

    async create(input: EnvelopeInput): Promise<Envelope> {
      const errors = await validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const now = nowIso();
      const envelope: Envelope = {
        id: createId('env'),
        name: input.name.trim(),
        categoryId: input.categoryId,
        monthlyAmountMinor: input.monthlyAmountMinor,
        rollover: input.rollover,
        startMonth: monthKey(clock()),
        archived: false,
        sample: false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = envelopeSchema.safeParse(envelope);
      if (!parsed.success) throw new AppError('VALIDATION', 'That envelope could not be saved.');
      await database.envelopes.add(parsed.data);
      return parsed.data;
    },

    async update(id: string, input: EnvelopeInput): Promise<Envelope> {
      const current = await database.envelopes.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That envelope is no longer here.');
      const errors = await validate(input, id);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const next: Envelope = {
        ...current,
        name: input.name.trim(),
        categoryId: input.categoryId,
        monthlyAmountMinor: input.monthlyAmountMinor,
        rollover: input.rollover,
        updatedAt: nowIso(),
      };
      const parsed = envelopeSchema.safeParse(next);
      if (!parsed.success) throw new AppError('VALIDATION', 'That envelope could not be saved.');
      await database.envelopes.put(parsed.data);
      return parsed.data;
    },

    async archive(id: string): Promise<void> {
      const current = await database.envelopes.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That envelope is no longer here.');
      await database.envelopes.update(id, { archived: true, updatedAt: nowIso() });
    },

    async restore(id: string): Promise<void> {
      const current = await database.envelopes.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That envelope is no longer here.');
      await database.envelopes.update(id, { archived: false, updatedAt: nowIso() });
    },
  };
}

export type EnvelopesRepository = ReturnType<typeof createEnvelopesRepository>;
