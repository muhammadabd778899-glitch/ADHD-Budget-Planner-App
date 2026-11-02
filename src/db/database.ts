import Dexie, { type Table } from 'dexie';
import type {
  Bill,
  BillOccurrence,
  Category,
  Debt,
  IncomeSource,
  SavingsEntry,
  SavingsGoal,
  Settings,
  Transaction,
} from '@/domain/types';

export const CURRENT_DB_VERSION = 2;
export const DB_NAME = 'tide-budget';

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

export class TideDatabase extends Dexie {
  settings!: Table<Settings, string>;
  categories!: Table<Category, string>;
  incomeSources!: Table<IncomeSource, string>;
  bills!: Table<Bill, string>;
  billOccurrences!: Table<BillOccurrence, string>;
  transactions!: Table<Transaction, string>;
  debts!: Table<Debt, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  savingsEntries!: Table<SavingsEntry, string>;

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
  }
}

export const db = new TideDatabase();

export async function deleteDatabase(name = DB_NAME): Promise<void> {
  await Dexie.delete(name);
}
