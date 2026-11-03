import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Bill,
  BillOccurrence,
  Category,
  Debt,
  Envelope,
  IncomeSource,
  Note,
  SavingsEntry,
  SavingsGoal,
  Settings,
  Transaction,
} from '@/domain/types';
import { DEFAULT_ACCOUNT_ID } from '@/domain/accounts';

export const CURRENT_DB_VERSION = 3;
export const DB_NAME = 'tide-budget';
export { DEFAULT_ACCOUNT_ID };

const V3_STORES = {
  settings: 'id',
  accounts: 'id, updatedAt',
  categories: 'id, kind, updatedAt',
  incomeSources: 'id, anchorDate, accountId, updatedAt',
  bills: 'id, anchorDate, accountId, updatedAt',
  billOccurrences: 'id, billId, dueDate, status, [billId+dueDate], updatedAt',
  transactions:
    'id, date, type, categoryId, status, billOccurrenceId, billId, debtId, incomeSourceId, accountId, updatedAt',
  debts: 'id, updatedAt',
  savingsGoals: 'id, updatedAt',
  savingsEntries: 'id, goalId, date, accountId, updatedAt',
  envelopes: 'id, categoryId, updatedAt',
  notes: 'id, kind, month, updatedAt',
};

const V2_STORES = {
  settings: 'id',
  categories: 'id, kind, updatedAt',
  incomeSources: 'id, anchorDate, updatedAt',
  bills: 'id, anchorDate, updatedAt',
  billOccurrences: 'id, billId, dueDate, status, [billId+dueDate], updatedAt',
  transactions:
    'id, date, type, categoryId, status, billOccurrenceId, billId, debtId, incomeSourceId, updatedAt',
  debts: 'id, updatedAt',
  savingsGoals: 'id, updatedAt',
  savingsEntries: 'id, goalId, date, updatedAt',
};

const V1_STORES = {
  settings: 'id',
  categories: 'id, kind',
  incomeSources: 'id, anchorDate',
  bills: 'id, anchorDate',
  billOccurrences: 'id, billId, dueDate, status, [billId+dueDate]',
  transactions:
    'id, date, type, categoryId, status, billOccurrenceId, billId, debtId, incomeSourceId',
  debts: 'id',
  savingsGoals: 'id',
  savingsEntries: 'id, goalId, date',
};

export class HarborDatabase extends Dexie {
  settings!: Table<Settings, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  incomeSources!: Table<IncomeSource, string>;
  bills!: Table<Bill, string>;
  billOccurrences!: Table<BillOccurrence, string>;
  transactions!: Table<Transaction, string>;
  debts!: Table<Debt, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  savingsEntries!: Table<SavingsEntry, string>;
  envelopes!: Table<Envelope, string>;
  notes!: Table<Note, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores(V1_STORES);
    this.version(2)
      .stores(V2_STORES)
      .upgrade(async (tx) => {
        const tables = [
          'categories',
          'incomeSources',
          'bills',
          'billOccurrences',
          'transactions',
          'debts',
          'savingsGoals',
          'savingsEntries',
        ];
        for (const tableName of tables) {
          await tx
            .table(tableName)
            .toCollection()
            .modify((record: Record<string, unknown>) => {
              const now = new Date().toISOString();
              if (typeof record.createdAt !== 'string' || !record.createdAt) {
                record.createdAt = now;
              }
              if (typeof record.updatedAt !== 'string' || !record.updatedAt) {
                record.updatedAt = record.createdAt;
              }
            });
        }
        const settings = await tx.table('settings').get('app');
        if (settings) {
          await tx.table('settings').update('app', {
            schemaVersion: CURRENT_DB_VERSION,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    this.version(3)
      .stores(V3_STORES)
      .upgrade(async (tx) => {
        const now = new Date().toISOString();
        const accounts = tx.table('accounts');
        if ((await accounts.count()) === 0) {
          await accounts.add({
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
        for (const tableName of ['transactions', 'bills', 'incomeSources', 'savingsEntries']) {
          await tx
            .table(tableName)
            .toCollection()
            .modify((record: Record<string, unknown>) => {
              if (!record.accountId) record.accountId = DEFAULT_ACCOUNT_ID;
            });
        }
        await tx
          .table('bills')
          .toCollection()
          .modify((record: Record<string, unknown>) => {
            if (record.secondDay === undefined) record.secondDay = null;
          });
        await tx
          .table('savingsGoals')
          .toCollection()
          .modify((record: Record<string, unknown>) => {
            if (!record.kind) record.kind = 'goal';
            if (typeof record.monthlyTargetMinor !== 'number') record.monthlyTargetMinor = 0;
            if (typeof record.autoSavePercent !== 'number') record.autoSavePercent = 0;
          });
        const settings = await tx.table('settings').get('app');
        if (settings) {
          await tx.table('settings').update('app', { schemaVersion: 3, updatedAt: now });
        }
      });
  }
}

export const db = new HarborDatabase();

export async function deleteDatabase(name = DB_NAME): Promise<void> {
  await Dexie.delete(name);
}
