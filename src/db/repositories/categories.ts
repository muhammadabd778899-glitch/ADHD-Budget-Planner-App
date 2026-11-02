import type { Category, CategoryKind } from '@/domain/types';
import { categorySchema } from '@/domain/schemas';
import type { TideDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { DEFAULT_CATEGORIES } from '@/db/defaults';
import { createId, nowIso } from '@/lib/ids';

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  color?: string;
  icon?: string;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function createCategoriesRepository(database: TideDatabase) {
  async function assertUnique(name: string, kind: CategoryKind, ignoreId?: string) {
    const categories = await database.categories.toArray();
    const clash = categories.find(
      (category) =>
        category.id !== ignoreId &&
        category.kind === kind &&
        !category.archived &&
        normalizeName(category.name) === normalizeName(name),
    );
    if (clash) {
      throw new AppError('CONFLICT', `You already have a ${kind} category called “${name}”.`);
    }
  }

  return {
    async list(includeArchived = false): Promise<Category[]> {
      const categories = await database.categories.toArray();
      return categories
        .filter((category) => includeArchived || !category.archived)
        .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
    },

    async ensureDefaults(): Promise<void> {
      const existing = await database.categories.toArray();
      const ids = new Set(existing.map((category) => category.id));
      const now = nowIso();
      const missing = DEFAULT_CATEGORIES.filter((category) => !ids.has(category.id)).map(
        (category) => ({ ...category, createdAt: now, updatedAt: now }),
      );
      if (missing.length > 0) await database.categories.bulkPut(missing);
    },

    async create(input: CategoryInput): Promise<Category> {
      const name = input.name.trim();
      if (!name) throw new AppError('VALIDATION', 'Give the category a name.');
      await assertUnique(name, input.kind);
      const now = nowIso();
      const category: Category = {
        id: createId('cat'),
        name,
        kind: input.kind,
        color: input.color ?? (input.kind === 'income' ? 'sage' : 'stone'),
        icon: input.icon ?? (input.kind === 'income' ? 'wallet' : 'dot'),
        system: false,
        archived: false,
        sample: false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = categorySchema.safeParse(category);
      if (!parsed.success) {
        throw new AppError('VALIDATION', 'That category could not be saved.');
      }
      await database.categories.add(parsed.data);
      return parsed.data;
    },

    async update(id: string, input: Partial<CategoryInput>): Promise<Category> {
      const current = await database.categories.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That category is no longer here.');
      const next: Category = {
        ...current,
        ...input,
        name: input.name?.trim() ?? current.name,
        updatedAt: nowIso(),
      };
      if (!next.name) throw new AppError('VALIDATION', 'Give the category a name.');
      await assertUnique(next.name, next.kind, id);
      const parsed = categorySchema.safeParse(next);
      if (!parsed.success) throw new AppError('VALIDATION', 'That category could not be saved.');
      await database.categories.put(parsed.data);
      return parsed.data;
    },

    async archive(id: string): Promise<void> {
      const current = await database.categories.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That category is no longer here.');
      if (current.system) {
        throw new AppError(
          'CONFLICT',
          'Built-in categories cannot be archived because existing records may use them.',
        );
      }
      await database.categories.update(id, { archived: true, updatedAt: nowIso() });
    },

    async restore(id: string): Promise<void> {
      const current = await database.categories.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That category is no longer here.');
      await assertUnique(current.name, current.kind, id);
      await database.categories.update(id, { archived: false, updatedAt: nowIso() });
    },
  };
}

export type CategoriesRepository = ReturnType<typeof createCategoriesRepository>;
