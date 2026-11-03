import type { BackupFile, BackupPayload } from '@/domain/schemas';
import {
  buildBackup,
  countPayload,
  parseBackupText,
  validateRelationships,
  type BackupValidationResult,
} from '@/domain/backup';
import type { HarborDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { APP_VERSION } from '@/lib/app';
import { DEFAULT_ACCOUNT_ID } from '@/domain/accounts';
import { nowIso } from '@/lib/ids';

export function createBackupRepository(database: HarborDatabase) {
  async function payload(): Promise<BackupPayload> {
    const settings = await database.settings.get('app');
    if (!settings) throw new AppError('NOT_FOUND', 'Harbor settings are missing.');
    return {
      settings,
      accounts: await database.accounts.toArray(),
      categories: await database.categories.toArray(),
      incomeSources: await database.incomeSources.toArray(),
      bills: await database.bills.toArray(),
      billOccurrences: await database.billOccurrences.toArray(),
      transactions: await database.transactions.toArray(),
      debts: await database.debts.toArray(),
      savingsGoals: await database.savingsGoals.toArray(),
      savingsEntries: await database.savingsEntries.toArray(),
      envelopes: await database.envelopes.toArray(),
      notes: await database.notes.toArray(),
    };
  }

  return {
    async exportFile(): Promise<BackupFile> {
      const data = await payload();
      const errors = validateRelationships(data);
      if (errors.length > 0) {
        throw new AppError(
          'STORAGE',
          'Harbor noticed an inconsistency and did not create a misleading backup. Export a copy of your browser storage and contact support.',
          errors.slice(0, 8),
        );
      }
      return buildBackup(data, APP_VERSION);
    },

    async exportText(): Promise<string> {
      const file = await this.exportFile();
      return JSON.stringify(file, null, 2);
    },

    validateText(text: string): BackupValidationResult {
      return parseBackupText(text);
    },

    async restore(backup: BackupFile): Promise<{ counts: Record<string, number> }> {
      const errors = validateRelationships(backup.data);
      if (errors.length > 0) {
        throw new AppError(
          'RESTORE',
          'This backup contains records that do not fit together, so nothing was changed.',
          errors.slice(0, 10),
        );
      }
      const data = backup.data;
      try {
        await database.transaction(
          'rw',
          [
            database.settings,
            database.accounts,
            database.categories,
            database.incomeSources,
            database.bills,
            database.billOccurrences,
            database.transactions,
            database.debts,
            database.savingsGoals,
            database.savingsEntries,
            database.envelopes,
            database.notes,
          ],
          async () => {
            await database.settings.clear();
            await database.accounts.clear();
            await database.categories.clear();
            await database.incomeSources.clear();
            await database.bills.clear();
            await database.billOccurrences.clear();
            await database.transactions.clear();
            await database.debts.clear();
            await database.savingsGoals.clear();
            await database.savingsEntries.clear();
            await database.envelopes.clear();
            await database.notes.clear();

            await database.settings.add(data.settings);
            if (data.accounts.length > 0) await database.accounts.bulkPut(data.accounts);
            if (data.categories.length > 0) await database.categories.bulkPut(data.categories);
            if (data.incomeSources.length > 0)
              await database.incomeSources.bulkPut(data.incomeSources);
            if (data.bills.length > 0) await database.bills.bulkPut(data.bills);
            if (data.billOccurrences.length > 0) {
              await database.billOccurrences.bulkPut(data.billOccurrences);
            }
            if (data.transactions.length > 0)
              await database.transactions.bulkPut(data.transactions);
            if (data.debts.length > 0) await database.debts.bulkPut(data.debts);
            if (data.savingsGoals.length > 0) {
              await database.savingsGoals.bulkPut(data.savingsGoals);
            }
            if (data.savingsEntries.length > 0) {
              await database.savingsEntries.bulkPut(data.savingsEntries);
            }
            if (data.envelopes.length > 0) await database.envelopes.bulkPut(data.envelopes);
            if (data.notes.length > 0) await database.notes.bulkPut(data.notes);
            if (data.accounts.length === 0) {
              const now = nowIso();
              await database.accounts.add({
                id: DEFAULT_ACCOUNT_ID,
                name: 'Main account',
                kind: 'checking',
                openingBalanceMinor: data.settings.startingBalanceMinor,
                archived: false,
                sample: false,
                createdAt: now,
                updatedAt: now,
              });
            }
          },
        );
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          'RESTORE',
          'The restore could not finish, so your existing data was left unchanged. Try a fresh backup file.',
        );
      }
      return { counts: countPayload(data) };
    },
  };
}

export type BackupRepository = ReturnType<typeof createBackupRepository>;
