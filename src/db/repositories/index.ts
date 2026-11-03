import type { HarborDatabase } from '@/db/database';
import { createSettingsRepository } from '@/db/repositories/settings';
import { createAccountsRepository } from '@/db/repositories/accounts';
import { createCategoriesRepository } from '@/db/repositories/categories';
import { createIncomeRepository } from '@/db/repositories/income';
import { createBillsRepository } from '@/db/repositories/bills';
import { createTransactionsRepository } from '@/db/repositories/transactions';
import { createDebtsRepository } from '@/db/repositories/debts';
import { createSavingsRepository } from '@/db/repositories/savings';
import { createEnvelopesRepository } from '@/db/repositories/envelopes';
import { createNotesRepository } from '@/db/repositories/notes';
import { createBackupRepository } from '@/db/repositories/backup';
import { createSampleRepository } from '@/db/repositories/sample';
import { addMonthsClamped, todayISO } from '@/lib/dates';

export function createRepositories(database: HarborDatabase) {
  return {
    settings: createSettingsRepository(database),
    accounts: createAccountsRepository(database),
    categories: createCategoriesRepository(database),
    income: createIncomeRepository(database),
    bills: createBillsRepository(database),
    transactions: createTransactionsRepository(database),
    debts: createDebtsRepository(database),
    savings: createSavingsRepository(database),
    envelopes: createEnvelopesRepository(database),
    notes: createNotesRepository(database),
    backup: createBackupRepository(database),
    sample: createSampleRepository(database),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

export async function initializeData(repos: Repositories, today = todayISO()): Promise<void> {
  await repos.settings.ensure();
  await repos.accounts.ensureDefault();
  await repos.categories.ensureDefaults();
  await repos.bills.ensureOccurrences(addMonthsClamped(today, -18), addMonthsClamped(today, 24));
}
