import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppError, describeError } from '@/db/errors';
import { createRepositories, initializeData } from '@/db/repositories';
import { db } from '@/db/database';
import type {
  AppSnapshot,
  Bill,
  Category,
  DateOnly,
  Debt,
  IncomeSource,
  SavingsEntry,
  SavingsGoal,
  Settings,
  Transaction,
  TransactionType,
} from '@/domain/types';
import type { BackupFile } from '@/domain/schemas';
import type { BillInput } from '@/db/repositories/bills';
import type { IncomeSourceInput } from '@/db/repositories/income';
import type { DebtInput } from '@/db/repositories/debts';
import type { SavingsGoalInput } from '@/db/repositories/savings';
import type { CategoryInput } from '@/db/repositories/categories';
import type { TransactionInput } from '@/db/repositories/transactions';
import type { SettingsPatch } from '@/db/repositories/settings';
import { readStorageHealth, requestPersistentStorage } from '@/lib/storage';
import type { BackupValidationResult } from '@/domain/backup';
import { useToast } from '@/components/ui/ToastProvider';

export interface QuickAddPrefill {
  type?: TransactionType;
  amountMinor?: number;
  description?: string;
  categoryId?: string | null;
  date?: DateOnly;
  incomeSourceId?: string | null;
  sample?: boolean;
}

interface AppDataContextValue {
  status: 'loading' | 'ready' | 'error';
  snapshot: AppSnapshot | null;
  error: ReturnType<typeof describeError> | null;
  busy: boolean;
  lastSavedAt: Date | null;
  refresh: () => Promise<void>;
  quickAdd: QuickAddPrefill | null;
  openQuickAdd: (prefill?: QuickAddPrefill) => void;
  closeQuickAdd: () => void;
  actions: {
    updateSettings: (patch: SettingsPatch) => Promise<Settings>;
    completeOnboarding: (patch: SettingsPatch) => Promise<Settings>;
    createTransaction: (input: TransactionInput) => Promise<Transaction>;
    updateTransaction: (id: string, input: TransactionInput) => Promise<Transaction>;
    deleteTransaction: (id: string) => Promise<Transaction>;
    restoreTransaction: (transaction: Transaction) => Promise<Transaction>;
    createIncome: (input: IncomeSourceInput) => Promise<IncomeSource>;
    updateIncome: (id: string, input: IncomeSourceInput) => Promise<IncomeSource>;
    setIncomeActive: (id: string, active: boolean) => Promise<IncomeSource>;
    removeIncome: (id: string) => Promise<void>;
    createBill: (input: BillInput) => Promise<Bill>;
    updateBill: (id: string, input: BillInput, effectiveFrom?: DateOnly) => Promise<Bill>;
    archiveBill: (id: string) => Promise<void>;
    restoreBill: (id: string) => Promise<void>;
    markBillPaid: (occurrenceId: string, paidDate?: DateOnly) => Promise<void>;
    markBillUnpaid: (occurrenceId: string) => Promise<void>;
    skipBill: (occurrenceId: string) => Promise<void>;
    unskipBill: (occurrenceId: string) => Promise<void>;
    createDebt: (input: DebtInput) => Promise<Debt>;
    updateDebt: (id: string, input: DebtInput) => Promise<Debt>;
    archiveDebt: (id: string) => Promise<void>;
    restoreDebt: (id: string) => Promise<void>;
    recordDebtPayment: (
      debtId: string,
      amountMinor: number,
      date: DateOnly,
      note?: string,
    ) => Promise<Transaction>;
    createGoal: (input: SavingsGoalInput) => Promise<SavingsGoal>;
    updateGoal: (id: string, input: SavingsGoalInput) => Promise<SavingsGoal>;
    archiveGoal: (id: string) => Promise<void>;
    restoreGoal: (id: string) => Promise<void>;
    addSavingsEntry: (
      goalId: string,
      amountMinor: number,
      date: DateOnly,
      note?: string,
    ) => Promise<SavingsEntry>;
    deleteSavingsEntry: (id: string) => Promise<SavingsEntry>;
    createCategory: (input: CategoryInput) => Promise<Category>;
    updateCategory: (id: string, input: Partial<CategoryInput>) => Promise<Category>;
    archiveCategory: (id: string) => Promise<void>;
    restoreCategory: (id: string) => Promise<void>;
    exportBackup: () => Promise<BackupFile>;
    validateBackup: (text: string) => BackupValidationResult;
    restoreBackup: (backup: BackupFile) => Promise<void>;
    seedSample: () => Promise<void>;
    removeSample: () => Promise<void>;
    requestPersistence: () => Promise<boolean>;
  };
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const repositories = createRepositories(db);

function snapshotError(error: unknown): ReturnType<typeof describeError> {
  return describeError(error);
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [error, setError] = useState<ReturnType<typeof describeError> | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [quickAdd, setQuickAdd] = useState<QuickAddPrefill | null>(null);
  const mounted = useRef(true);
  const loadTaskRef = useRef<Promise<AppSnapshot> | null>(null);
  const pushToast = useToast();

  const loadSnapshot = useCallback(async (): Promise<AppSnapshot> => {
    const settings = await repositories.settings.get();
    const [
      categories,
      incomeSources,
      bills,
      billOccurrences,
      transactions,
      debts,
      savingsGoals,
      savingsEntries,
      storage,
    ] = await Promise.all([
      repositories.categories.list(true),
      repositories.income.list(),
      repositories.bills.list(),
      db.billOccurrences.toArray(),
      repositories.transactions.list(),
      repositories.debts.list(),
      repositories.savings.listGoals(),
      repositories.savings.listEntries(),
      readStorageHealth(),
    ]);
    return {
      settings,
      categories,
      incomeSources,
      bills,
      billOccurrences,
      transactions,
      debts,
      savingsGoals,
      savingsEntries,
      storage,
    };
  }, []);

  const loadOnce = useCallback(async (): Promise<AppSnapshot> => {
    const existingTask = loadTaskRef.current;
    if (existingTask) return existingTask;
    const task = (async () => {
      await initializeData(repositories);
      return loadSnapshot();
    })();
    loadTaskRef.current = task;
    try {
      return await task;
    } finally {
      if (loadTaskRef.current === task) loadTaskRef.current = null;
    }
  }, [loadSnapshot]);

  const refresh = useCallback(async () => {
    const next = await loadSnapshot();
    if (!mounted.current) return;
    setSnapshot(next);
    setStatus('ready');
    setError(null);
  }, [loadSnapshot]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const task = loadOnce();
    void (async () => {
      try {
        const next = await task;
        if (cancelled) return;
        setSnapshot(next);
        setStatus('ready');
        setError(null);
      } catch (caught) {
        if (cancelled) return;
        console.error(
          'Tide could not load its local plan.',
          (caught as Error).stack ?? String(caught),
        );
        setError(snapshotError(caught));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [loadOnce]);

  const perform = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      options: { successMessage?: string; successTitle?: string } = {},
    ): Promise<T> => {
      setBusy(true);
      try {
        const result = await operation();
        await refresh();
        setLastSavedAt(new Date());
        if (options.successMessage) {
          pushToast({
            tone: 'success',
            title: options.successTitle ?? 'Saved',
            message: options.successMessage,
          });
        }
        return result;
      } catch (caught) {
        const described = snapshotError(caught);
        pushToast({
          tone: 'error',
          title: described.title,
          message: described.message,
          details: described.details,
        });
        throw caught;
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [pushToast, refresh],
  );

  const actions = useMemo<AppDataContextValue['actions']>(
    () => ({
      updateSettings: (patch) =>
        perform(() => repositories.settings.update(patch), {
          successTitle: 'Settings saved',
          successMessage: 'Your preferences are up to date.',
        }),
      completeOnboarding: (patch) => perform(() => repositories.settings.completeOnboarding(patch)),
      createTransaction: (input) =>
        perform(() => repositories.transactions.create(input), {
          successTitle: 'Added',
          successMessage: 'Your transaction is saved locally.',
        }),
      updateTransaction: (id, input) =>
        perform(() => repositories.transactions.update(id, input), {
          successTitle: 'Updated',
          successMessage: 'Your changes are saved.',
        }),
      deleteTransaction: (id) => perform(() => repositories.transactions.delete(id)),
      restoreTransaction: (transaction) =>
        perform(() => repositories.transactions.restore(transaction), {
          successTitle: 'Restored',
          successMessage: 'The transaction is back.',
        }),
      createIncome: (input) =>
        perform(() => repositories.income.create(input), {
          successTitle: 'Income added',
          successMessage: 'Your payday schedule is ready.',
        }),
      updateIncome: (id, input) =>
        perform(() => repositories.income.update(id, input), {
          successTitle: 'Income updated',
          successMessage: 'Future paydays use the new schedule.',
        }),
      setIncomeActive: (id, active) =>
        perform(() => repositories.income.setActive(id, active), {
          successTitle: active ? 'Income resumed' : 'Income paused',
          successMessage: active
            ? 'Projected paydays are back on the dashboard.'
            : 'This source no longer projects paydays.',
        }),
      removeIncome: (id) =>
        perform(() => repositories.income.remove(id), {
          successTitle: 'Income removed',
          successMessage: 'Existing received income was kept.',
        }),
      createBill: (input) =>
        perform(() => repositories.bills.create(input), {
          successTitle: 'Bill added',
          successMessage: 'Upcoming due dates are now reserved in your plan.',
        }),
      updateBill: (id, input, effectiveFrom) =>
        perform(() => repositories.bills.update(id, input, effectiveFrom), {
          successTitle: 'Bill updated',
          successMessage: 'Future due dates use the new details. Paid history is unchanged.',
        }),
      archiveBill: (id) =>
        perform(() => repositories.bills.archive(id), {
          successTitle: 'Bill archived',
          successMessage: 'Future unpaid due dates no longer reserve money.',
        }),
      restoreBill: (id) =>
        perform(() => repositories.bills.restore(id), {
          successTitle: 'Bill restored',
          successMessage: 'Upcoming due dates are projected again.',
        }),
      markBillPaid: async (occurrenceId, paidDate) => {
        await perform(() => repositories.bills.markPaid(occurrenceId, paidDate), {
          successTitle: 'Bill paid',
          successMessage: 'One expense was recorded and the bill is no longer reserved.',
        });
      },
      markBillUnpaid: async (occurrenceId) => {
        await perform(() => repositories.bills.markUnpaid(occurrenceId), {
          successTitle: 'Bill marked unpaid',
          successMessage: 'The linked payment was removed and the bill is reserved again.',
        });
      },
      skipBill: async (occurrenceId) => {
        await perform(() => repositories.bills.skip(occurrenceId), {
          successTitle: 'Bill skipped',
          successMessage: 'This occurrence will not be reserved.',
        });
      },
      unskipBill: async (occurrenceId) => {
        await perform(() => repositories.bills.unskip(occurrenceId), {
          successTitle: 'Bill restored',
          successMessage: 'This occurrence is unpaid and reserved again.',
        });
      },
      createDebt: (input) =>
        perform(() => repositories.debts.create(input), {
          successTitle: 'Debt added',
          successMessage: 'You can record payments as you make them.',
        }),
      updateDebt: (id, input) =>
        perform(() => repositories.debts.update(id, input), {
          successTitle: 'Debt updated',
          successMessage: 'Your changes are saved.',
        }),
      archiveDebt: (id) =>
        perform(() => repositories.debts.archive(id), {
          successTitle: 'Debt archived',
          successMessage: 'Payment history was kept.',
        }),
      restoreDebt: (id) =>
        perform(() => repositories.debts.restore(id), {
          successTitle: 'Debt restored',
          successMessage: 'This debt is active again.',
        }),
      recordDebtPayment: (debtId, amountMinor, date, note) =>
        perform(() => repositories.debts.recordPayment(debtId, amountMinor, date, note), {
          successTitle: 'Payment recorded',
          successMessage: 'Your debt balance and spending are updated together.',
        }),
      createGoal: (input) =>
        perform(() => repositories.savings.createGoal(input), {
          successTitle: 'Goal added',
          successMessage: 'Add a contribution whenever you move money aside.',
        }),
      updateGoal: (id, input) =>
        perform(() => repositories.savings.updateGoal(id, input), {
          successTitle: 'Goal updated',
          successMessage: 'Your progress is recalculated from saved entries.',
        }),
      archiveGoal: (id) =>
        perform(() => repositories.savings.archiveGoal(id), {
          successTitle: 'Goal archived',
          successMessage: 'Its history was kept and it no longer appears in totals.',
        }),
      restoreGoal: (id) =>
        perform(() => repositories.savings.restoreGoal(id), {
          successTitle: 'Goal restored',
          successMessage: 'This goal is active again.',
        }),
      addSavingsEntry: (goalId, amountMinor, date, note) =>
        perform(() => repositories.savings.addEntry(goalId, amountMinor, date, note), {
          successTitle: 'Savings updated',
          successMessage: 'This transfer changes cash on hand and goal progress.',
        }),
      deleteSavingsEntry: (id) =>
        perform(() => repositories.savings.deleteEntry(id), {
          successTitle: 'Savings entry removed',
          successMessage: 'Goal progress was recalculated.',
        }),
      createCategory: (input) =>
        perform(() => repositories.categories.create(input), {
          successTitle: 'Category added',
          successMessage: 'It is ready in the category picker.',
        }),
      updateCategory: (id, input) =>
        perform(() => repositories.categories.update(id, input), {
          successTitle: 'Category updated',
          successMessage: 'Your changes are saved.',
        }),
      archiveCategory: (id) =>
        perform(() => repositories.categories.archive(id), {
          successTitle: 'Category archived',
          successMessage: 'Existing records keep their category.',
        }),
      restoreCategory: (id) =>
        perform(() => repositories.categories.restore(id), {
          successTitle: 'Category restored',
          successMessage: 'It is available again.',
        }),
      exportBackup: () => repositories.backup.exportFile(),
      validateBackup: (text) => repositories.backup.validateText(text),
      restoreBackup: async (backup) => {
        await perform(() => repositories.backup.restore(backup), {
          successTitle: 'Backup restored',
          successMessage: 'Your data was replaced with the records from this file.',
        });
      },
      seedSample: async () => {
        const result = await perform(() => repositories.sample.seed(), {
          successTitle: 'Sample data added',
          successMessage: 'Everything sample is labelled and can be removed in one step.',
        });
        if (result.records === 0) {
          pushToast({ tone: 'info', title: 'Sample data', message: 'There was nothing to add.' });
        }
      },
      removeSample: async () => {
        await perform(() => repositories.sample.remove(), {
          successTitle: 'Sample data removed',
          successMessage: 'Your own records were left untouched.',
        });
      },
      requestPersistence: async () => {
        const granted = await requestPersistentStorage();
        await refresh();
        pushToast({
          tone: granted ? 'success' : 'info',
          title: granted ? 'Storage protected' : 'Storage request',
          message: granted
            ? 'Your browser agreed to keep Tide data during storage pressure.'
            : 'Your browser did not grant persistent storage. Keep regular backups.',
        });
        return granted;
      },
    }),
    [perform, pushToast, refresh],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      status,
      snapshot,
      error,
      busy,
      lastSavedAt,
      refresh,
      quickAdd,
      openQuickAdd: (prefill = {}) => setQuickAdd(prefill),
      closeQuickAdd: () => setQuickAdd(null),
      actions,
    }),
    [actions, busy, error, lastSavedAt, quickAdd, refresh, snapshot, status],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider');
  return context;
}

export function useAppActions() {
  return useAppData().actions;
}

export function useSnapshot(): AppSnapshot {
  const { snapshot } = useAppData();
  if (!snapshot) throw new Error('Snapshot is not ready');
  return snapshot;
}

export { AppError };
