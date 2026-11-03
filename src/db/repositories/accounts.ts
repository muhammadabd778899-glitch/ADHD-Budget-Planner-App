import type { Account, AccountKind } from '@/domain/types';
import { accountSchema } from '@/domain/schemas';
import { DEFAULT_ACCOUNT_ID } from '@/domain/accounts';
import type { HarborDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { createId, nowIso } from '@/lib/ids';

export interface AccountInput {
  name: string;
  kind: AccountKind;
  openingBalanceMinor: number;
}

function validate(input: AccountInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Name is required.');
  if (!Number.isSafeInteger(input.openingBalanceMinor) || input.openingBalanceMinor < 0) {
    errors.push('Enter a valid opening balance.');
  }
  return errors;
}

export function createAccountsRepository(database: HarborDatabase) {
  async function ensureDefault(): Promise<void> {
    const count = await database.accounts.count();
    if (count > 0) return;
    const now = nowIso();
    await database.accounts.add({
      id: DEFAULT_ACCOUNT_ID,
      name: 'Main account',
      kind: 'checking',
      openingBalanceMinor: 0,
      archived: false,
      sample: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    ensureDefault,

    async list(): Promise<Account[]> {
      const rows = await database.accounts.toArray();
      return rows.sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
    },

    async create(input: AccountInput): Promise<Account> {
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const now = nowIso();
      const account: Account = {
        id: createId('acct'),
        name: input.name.trim(),
        kind: input.kind,
        openingBalanceMinor: input.openingBalanceMinor,
        archived: false,
        sample: false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = accountSchema.safeParse(account);
      if (!parsed.success) throw new AppError('VALIDATION', 'That account could not be saved.');
      await database.accounts.add(parsed.data);
      return parsed.data;
    },

    /**
     * The main account keeps its starting point in Settings, so editing it here
     * updates both records and the overall plan stays consistent.
     */
    async update(id: string, input: AccountInput): Promise<Account> {
      const current = await database.accounts.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That account is no longer here.');
      const errors = validate(input);
      if (errors.length > 0) throw new AppError('VALIDATION', errors[0]!, errors);
      const now = nowIso();
      const next: Account = {
        ...current,
        name: input.name.trim(),
        kind: input.kind,
        openingBalanceMinor: input.openingBalanceMinor,
        updatedAt: now,
      };
      const parsed = accountSchema.safeParse(next);
      if (!parsed.success) throw new AppError('VALIDATION', 'That account could not be saved.');
      await database.transaction('rw', database.accounts, database.settings, async () => {
        await database.accounts.put(parsed.data);
        if (id === DEFAULT_ACCOUNT_ID) {
          await database.settings.update('app', {
            startingBalanceMinor: input.openingBalanceMinor,
            updatedAt: now,
          });
        }
      });
      return parsed.data;
    },

    async archive(id: string): Promise<void> {
      const current = await database.accounts.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That account is no longer here.');
      if (id === DEFAULT_ACCOUNT_ID) {
        throw new AppError('CONFLICT', 'The main account cannot be archived.');
      }
      await database.accounts.update(id, { archived: true, updatedAt: nowIso() });
    },

    async restore(id: string): Promise<void> {
      const current = await database.accounts.get(id);
      if (!current) throw new AppError('NOT_FOUND', 'That account is no longer here.');
      await database.accounts.update(id, { archived: false, updatedAt: nowIso() });
    },
  };
}

export type AccountsRepository = ReturnType<typeof createAccountsRepository>;
