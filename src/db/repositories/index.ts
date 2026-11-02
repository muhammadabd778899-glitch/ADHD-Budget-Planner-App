import type { TideDatabase } from '@/db/database';
import { createSettingsRepository } from '@/db/repositories/settings';
import { createCategoriesRepository } from '@/db/repositories/categories';
import { createIncomeRepository } from '@/db/repositories/income';
import { createBillsRepository } from '@/db/repositories/bills';
import { createTransactionsRepository } from '@/db/repositories/transactions';
import { createDebtsRepository } from '@/db/repositories/debts';
import { createSavingsRepository } from '@/db/repositories/savings';
import { createBackupRepository } from '@/db/repositories/backup';
import { createSampleRepository } from '@/db/repositories/sample';
import { addMonthsClamped, todayISO } from '@/lib/dates';

export function createRepositories(database: TideDatabase) {
  return {
    settings: createSettingsRepository(database),
    categories: createCategoriesRepository(database),
    income: createIncomeRepository(database),
    bills: createBillsRepository(database),
    transactions: createTransactionsRepository(database),
    debts: createDebtsRepository(database),
    savings: createSavingsRepository(database),
    backup: createBackupRepository(database),
    sample: createSampleRepository(database),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

export async function initializeData(repos: Repositories, today = todayISO()): Promise<void> {
  await repos.settings.ensure();
  await repos.categories.ensureDefaults();
  await repos.bills.ensureOccurrences(addMonthsClamped(today, -18), addMonthsClamped(today, 24));
}
