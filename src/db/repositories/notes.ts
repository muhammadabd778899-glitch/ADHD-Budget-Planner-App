import type { Note, NoteKind } from '@/domain/types';
import { noteSchema } from '@/domain/schemas';
import type { HarborDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { createId, nowIso } from '@/lib/ids';

export interface NoteInput {
  kind: NoteKind;
  month: string | null;
  text: string;
  pinned?: boolean;
}

function validate(input: NoteInput): string[] {
  const errors: string[] = [];
  if (!input.text.trim()) errors.push('Write something first.');
  if (input.text.trim().length > 4000) errors.push('Keep the note under 4000 characters.');
  if (input.kind === 'month' && !input.month) errors.push('Choose a month.');
  return errors;
}

export function createNotesRepository(database: HarborDatabase) {
  return {
    async list(): Promise<Note[]> {
      const rows = await database.notes.toArray();
      return rows.sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    },

    async create(input: NoteInput): Promise<Note> {
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const now = nowIso();
      const note: Note = {
        id: createId('note'),
        kind: input.kind,
        month: input.kind === 'month' ? (input.month ?? null) : null,
        text: input.text.trim(),
        pinned: input.pinned ?? false,
        archived: false,
        sample: false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = noteSchema.safeParse(note);
      if (!parsed.success) throw new AppError('VALIDATION', 'That note could not be saved.');
      await database.notes.add(parsed.data);
      return parsed.data;
    },

    async update(id: string, input: NoteInput): Promise<Note> {
      const current = await database.notes.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That note is no longer here.');
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const next: Note = {
        ...current,
        kind: input.kind,
        month: input.kind === 'month' ? (input.month ?? null) : null,
        text: input.text.trim(),
        pinned: input.pinned ?? current.pinned,
        updatedAt: nowIso(),
      };
      const parsed = noteSchema.safeParse(next);
      if (!parsed.success) throw new AppError('VALIDATION', 'That note could not be saved.');
      await database.notes.put(parsed.data);
      return parsed.data;
    },

    async setPinned(id: string, pinned: boolean): Promise<void> {
      const current = await database.notes.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That note is no longer here.');
      await database.notes.update(id, { pinned, updatedAt: nowIso() });
    },

    async archive(id: string): Promise<void> {
      const current = await database.notes.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That note is no longer here.');
      await database.notes.update(id, { archived: true, updatedAt: nowIso() });
    },

    async restore(id: string): Promise<void> {
      const current = await database.notes.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That note is no longer here.');
      await database.notes.update(id, { archived: false, updatedAt: nowIso() });
    },

    async remove(id: string): Promise<Note> {
      const current = await database.notes.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That note is no longer here.');
      await database.notes.delete(id);
      return current;
    },
  };
}

export type NotesRepository = ReturnType<typeof createNotesRepository>;
