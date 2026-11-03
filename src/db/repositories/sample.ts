import type {
  Account,
  Bill,
  BillOccurrence,
  DateOnly,
  Debt,
  Envelope,
  IncomeSource,
  Note,
  SavingsEntry,
  SavingsGoal,
  Transaction,
} from '@/domain/types';
import type { HarborDatabase } from '@/db/database';
import { AppError } from '@/db/errors';
import { nowIso } from '@/lib/ids';
import { addDays, addMonthsClamped, monthKey, todayISO } from '@/lib/dates';
import { occurrenceDatesInRange } from '@/lib/recurrence';
import { DEFAULT_ACCOUNT_ID } from '@/domain/accounts';

const SAMPLE_ACCOUNT_ID = 'sample-acct-wallet';

function bill(
  id: string,
  name: string,
  amountMinor: number,
  frequency: Bill['frequency'],
  anchorDate: DateOnly,
  categoryId: string,
  notes = '',
): Bill {
  const now = nowIso();
  return {
    id,
    name,
    amountMinor,
    frequency,
    anchorDate,
    endDate: null,
    secondDay: null,
    categoryId,
    accountId: DEFAULT_ACCOUNT_ID,
    autoPay: false,
    notes,
    active: true,
    sample: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function createSampleRepository(database: HarborDatabase, clock: () => DateOnly = todayISO) {
  return {
    async seed(): Promise<{ records: number }> {
      const today = clock();
      const settings = await database.settings.get('app');
      if (!settings) throw new AppError('NOT_FOUND', 'Harbor settings are missing.');
      if (settings.sampleDataLoaded) {
        throw new AppError('CONFLICT', 'Sample data is already loaded.');
      }

      const now = nowIso();
      const lastPayday = addDays(today, -4);
      const rentDue = addDays(today, 3);
      const internetDue = addDays(today, 5);
      const phoneDue = addDays(today, 8);
      const streamingDue = addDays(today, -6);

      const account: Account = {
        id: SAMPLE_ACCOUNT_ID,
        name: 'Cash wallet',
        kind: 'cash',
        openingBalanceMinor: 8_000,
        archived: false,
        sample: true,
        createdAt: now,
        updatedAt: now,
      };

      const income: IncomeSource = {
        id: 'sample-inc-paycheck',
        name: 'Paycheck — Northwind Studio',
        amountMinor: 245_000,
        frequency: 'biweekly',
        anchorDate: lastPayday,
        endDate: null,
        active: true,
        accountId: DEFAULT_ACCOUNT_ID,
        notes: 'Sample income. Remove it any time in Settings → Data.',
        sample: true,
        createdAt: now,
        updatedAt: now,
      };

      const bills: Bill[] = [
        bill('sample-bill-rent', 'Rent', 145_000, 'monthly', rentDue, 'cat-home'),
        bill('sample-bill-internet', 'Internet', 6_500, 'monthly', internetDue, 'cat-bills'),
        bill('sample-bill-phone', 'Phone', 4_500, 'monthly', phoneDue, 'cat-bills'),
        bill('sample-bill-streaming', 'Streaming', 1_599, 'monthly', streamingDue, 'cat-bills'),
        bill('sample-bill-gym', 'Gym', 3_500, 'monthly', addDays(today, 15), 'cat-health'),
        bill(
          'sample-bill-insurance',
          'Car insurance',
          12_000,
          'quarterly',
          addDays(today, 20),
          'cat-transport',
        ),
      ];

      const occurrences: BillOccurrence[] = [];
      const occurrenceFrom = addMonthsClamped(today, -2);
      const occurrenceTo = addMonthsClamped(today, 8);
      for (const sampleBill of bills) {
        const dates = occurrenceDatesInRange(
          {
            frequency: sampleBill.frequency,
            anchorDate: sampleBill.anchorDate,
            endDate: null,
          },
          occurrenceFrom,
          occurrenceTo,
        );
        for (const date of dates) {
          occurrences.push({
            id: `${sampleBill.id}__${date}`,
            billId: sampleBill.id,
            dueDate: date,
            amountMinor: sampleBill.amountMinor,
            status: 'unpaid',
            paidTransactionId: null,
            paidAt: null,
            skippedAt: null,
            sample: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      const streamingOccurrence = occurrences.find(
        (occurrence) =>
          occurrence.billId === 'sample-bill-streaming' && occurrence.dueDate === streamingDue,
      );
      if (streamingOccurrence) {
        streamingOccurrence.status = 'paid';
        streamingOccurrence.paidAt = streamingDue;
        streamingOccurrence.paidTransactionId = 'sample-tx-streaming';
      }

      const transactions: Array<Omit<Transaction, 'accountId'>> = [
        {
          id: 'sample-tx-paycheck',
          type: 'income',
          amountMinor: 245_000,
          date: lastPayday,
          description: 'Paycheck — Northwind Studio',
          categoryId: 'cat-income-paycheck',
          notes: 'Sample received income.',
          status: 'cleared',
          source: 'income',
          billId: null,
          billOccurrenceId: null,
          debtId: null,
          incomeSourceId: income.id,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-streaming',
          type: 'expense',
          amountMinor: 1_599,
          date: streamingDue,
          description: 'Streaming',
          categoryId: 'cat-bills',
          notes: 'Sample bill payment.',
          status: 'cleared',
          source: 'bill',
          billId: 'sample-bill-streaming',
          billOccurrenceId: streamingOccurrence?.id ?? null,
          debtId: null,
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-groceries',
          type: 'expense',
          amountMinor: 8_432,
          date: addDays(today, -2),
          description: 'Neighbourhood market',
          categoryId: 'cat-groceries',
          notes: '',
          status: 'cleared',
          source: 'sample',
          billId: null,
          billOccurrenceId: null,
          debtId: null,
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-coffee',
          type: 'expense',
          amountMinor: 575,
          date: addDays(today, -1),
          description: 'Coffee with Sam',
          categoryId: 'cat-fun',
          notes: 'A small nice thing.',
          status: 'cleared',
          source: 'sample',
          billId: null,
          billOccurrenceId: null,
          debtId: null,
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-transport',
          type: 'expense',
          amountMinor: 2_800,
          date: addDays(today, -5),
          description: 'Transit card top-up',
          categoryId: 'cat-transport',
          notes: '',
          status: 'cleared',
          source: 'sample',
          billId: null,
          billOccurrenceId: null,
          debtId: null,
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-fun',
          type: 'expense',
          amountMinor: 4_250,
          date: addDays(today, -8),
          description: 'Movie night',
          categoryId: 'cat-fun',
          notes: '',
          status: 'cleared',
          source: 'sample',
          billId: null,
          billOccurrenceId: null,
          debtId: null,
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-home',
          type: 'expense',
          amountMinor: 3_610,
          date: addDays(today, -10),
          description: 'Laundry and cleaning',
          categoryId: 'cat-home',
          notes: '',
          status: 'cleared',
          source: 'sample',
          billId: null,
          billOccurrenceId: null,
          debtId: null,
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-groceries-2',
          type: 'expense',
          amountMinor: 11_250,
          date: addDays(today, -12),
          description: 'Weekly grocery shop',
          categoryId: 'cat-groceries',
          notes: '',
          status: 'cleared',
          source: 'sample',
          billId: null,
          billOccurrenceId: null,
          debtId: null,
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-health',
          type: 'expense',
          amountMinor: 2_400,
          date: addDays(today, -15),
          description: 'Pharmacy',
          categoryId: 'cat-health',
          notes: '',
          status: 'cleared',
          source: 'sample',
          billId: null,
          billOccurrenceId: null,
          debtId: null,
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-pending',
          type: 'expense',
          amountMinor: 1_899,
          date: addDays(today, -1),
          description: 'Bookshop (pending)',
          categoryId: 'cat-fun',
          notes: 'Sample pending payment. It is not counted in cash on hand.',
          status: 'pending',
          source: 'sample',
          billId: null,
          billOccurrenceId: null,
          debtId: null,
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-tx-debt',
          type: 'expense',
          amountMinor: 15_000,
          date: addDays(today, -9),
          description: 'Payment — Visa',
          categoryId: 'cat-debt',
          notes: 'Sample debt payment.',
          status: 'cleared',
          source: 'debt',
          billId: null,
          billOccurrenceId: null,
          debtId: 'sample-debt-visa',
          incomeSourceId: null,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const walletTransactionIds = new Set(['sample-tx-coffee', 'sample-tx-transport']);
      const savedTransactions: Transaction[] = transactions.map((transaction) => ({
        ...transaction,
        accountId: walletTransactionIds.has(transaction.id)
          ? SAMPLE_ACCOUNT_ID
          : DEFAULT_ACCOUNT_ID,
      }));

      const debts: Debt[] = [
        {
          id: 'sample-debt-visa',
          name: 'Visa',
          kind: 'credit-card',
          balanceMinor: 124_000,
          interestRateBps: 2_199,
          minimumPaymentMinor: 3_500,
          targetPayoffDate: null,
          notes: 'Sample debt. Balance is reduced by recorded payments.',
          archived: false,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-debt-student',
          name: 'Student loan',
          kind: 'student-loan',
          balanceMinor: 840_000,
          interestRateBps: 549,
          minimumPaymentMinor: 12_000,
          targetPayoffDate: null,
          notes: 'Sample debt.',
          archived: false,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const goals: SavingsGoal[] = [
        {
          id: 'sample-goal-emergency',
          name: 'Emergency fund',
          kind: 'goal',
          targetMinor: 500_000,
          startingMinor: 120_000,
          monthlyTargetMinor: 0,
          autoSavePercent: 5,
          targetDate: addMonthsClamped(today, 10),
          color: 'sage',
          notes: 'A buffer for the unexpected.',
          archived: false,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-goal-trip',
          name: 'Japan trip',
          kind: 'goal',
          targetMinor: 300_000,
          startingMinor: 35_000,
          monthlyTargetMinor: 20_000,
          autoSavePercent: 0,
          targetDate: addMonthsClamped(today, 14),
          color: 'sky',
          notes: 'Something to look forward to.',
          archived: false,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-goal-gifts',
          name: 'Christmas gifts',
          kind: 'sinking',
          targetMinor: 60_000,
          startingMinor: 5_000,
          monthlyTargetMinor: 5_000,
          autoSavePercent: 0,
          targetDate: addMonthsClamped(today, 2),
          color: 'gold',
          notes: 'A sinking fund for the same expense every year.',
          archived: false,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const savingsEntries: Array<Omit<SavingsEntry, 'accountId'>> = [
        {
          id: 'sample-sav-emergency',
          goalId: 'sample-goal-emergency',
          amountMinor: 20_000,
          date: addDays(today, -7),
          note: 'Monthly transfer',
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-sav-trip',
          goalId: 'sample-goal-trip',
          amountMinor: 10_000,
          date: addDays(today, -14),
          note: 'Monthly transfer',
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const savedSavingsEntries: SavingsEntry[] = savingsEntries.map((entry) => ({
        ...entry,
        accountId: DEFAULT_ACCOUNT_ID,
      }));

      const thisMonth = monthKey(today);
      const envelopes: Envelope[] = [
        {
          id: 'sample-env-groceries',
          name: 'Groceries',
          categoryId: 'cat-groceries',
          monthlyAmountMinor: 42_000,
          rollover: true,
          startMonth: thisMonth,
          archived: false,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-env-fun',
          name: 'Fun money',
          categoryId: 'cat-fun',
          monthlyAmountMinor: 15_000,
          rollover: false,
          startMonth: thisMonth,
          archived: false,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const notes: Note[] = [
        {
          id: 'sample-note-brain-dump',
          kind: 'brain-dump',
          month: null,
          text: 'Sample brain dump: move the internet bill to autopay, ask about the annual insurance discount, plan a cheap weekend.',
          pinned: true,
          archived: false,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'sample-note-month',
          kind: 'month',
          month: thisMonth,
          text: 'Sample month note: this month felt steadier. Keep the grocery envelope and skip the unused streaming tier.',
          pinned: false,
          archived: false,
          sample: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      await database.transaction(
        'rw',
        [
          database.settings,
          database.accounts,
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
          await database.accounts.put(account);
          await database.incomeSources.put(income);
          await database.bills.bulkPut(bills);
          await database.billOccurrences.bulkPut(occurrences);
          await database.transactions.bulkPut(savedTransactions);
          await database.debts.bulkPut(debts);
          await database.savingsGoals.bulkPut(goals);
          await database.savingsEntries.bulkPut(savedSavingsEntries);
          await database.envelopes.bulkPut(envelopes);
          await database.notes.bulkPut(notes);
          await database.settings.update('app', {
            sampleDataLoaded: true,
            updatedAt: nowIso(),
          });
        },
      );

      return {
        records:
          bills.length +
          occurrences.length +
          savedTransactions.length +
          debts.length +
          goals.length +
          savedSavingsEntries.length +
          envelopes.length +
          notes.length +
          2,
      };
    },

    async remove(): Promise<{ removed: number }> {
      let removed = 0;
      await database.transaction(
        'rw',
        [
          database.settings,
          database.accounts,
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
          const sampleIncome = await database.incomeSources.filter((row) => row.sample).toArray();
          const sampleDebts = await database.debts.filter((row) => row.sample).toArray();
          const sampleGoals = await database.savingsGoals.filter((row) => row.sample).toArray();
          const sampleBillIds = new Set(
            (await database.bills.filter((row) => row.sample).toArray()).map((row) => row.id),
          );
          const sampleGoalIds = new Set(sampleGoals.map((goal) => goal.id));
          const sampleSourceIds = new Set(sampleIncome.map((source) => source.id));
          const sampleDebtIds = new Set(sampleDebts.map((debt) => debt.id));

          const realTransactions = await database.transactions
            .filter((row) => !row.sample)
            .toArray();
          for (const transaction of realTransactions) {
            const patch: Partial<Transaction> = {};
            if (transaction.incomeSourceId && sampleSourceIds.has(transaction.incomeSourceId)) {
              patch.incomeSourceId = null;
            }
            if (transaction.debtId && sampleDebtIds.has(transaction.debtId)) {
              patch.debtId = null;
            }
            if (Object.keys(patch).length > 0) {
              await database.transactions.update(transaction.id, {
                ...patch,
                updatedAt: nowIso(),
              });
            }
          }

          const realSavingsEntries = await database.savingsEntries
            .filter((row) => !row.sample)
            .toArray();
          for (const entry of realSavingsEntries) {
            if (sampleGoalIds.has(entry.goalId)) {
              throw new AppError(
                'CONFLICT',
                'A real savings entry is linked to a sample goal. Move that entry to a real goal before removing sample data.',
              );
            }
          }

          const sampleOccurrences = await database.billOccurrences
            .filter((row) => row.sample || sampleBillIds.has(row.billId))
            .toArray();
          removed += sampleOccurrences.length;
          if (sampleOccurrences.length > 0) {
            await database.billOccurrences.bulkDelete(
              sampleOccurrences.map((occurrence) => occurrence.id),
            );
          }

          const sampleTransactions = await database.transactions
            .filter((row) => row.sample)
            .toArray();
          removed += sampleTransactions.length;
          if (sampleTransactions.length > 0) {
            await database.transactions.bulkDelete(
              sampleTransactions.map((transaction) => transaction.id),
            );
          }

          const sampleEntries = await database.savingsEntries
            .filter((row) => row.sample || sampleGoalIds.has(row.goalId))
            .toArray();
          removed += sampleEntries.length;
          if (sampleEntries.length > 0) {
            await database.savingsEntries.bulkDelete(sampleEntries.map((entry) => entry.id));
          }

          const sampleBills = await database.bills.filter((row) => row.sample).toArray();
          removed += sampleBills.length;
          if (sampleBills.length > 0) {
            await database.bills.bulkDelete(sampleBills.map((row) => row.id));
          }

          removed += sampleIncome.length;
          if (sampleIncome.length > 0) {
            await database.incomeSources.bulkDelete(sampleIncome.map((row) => row.id));
          }

          removed += sampleDebts.length;
          if (sampleDebts.length > 0) {
            await database.debts.bulkDelete(sampleDebts.map((row) => row.id));
          }

          removed += sampleGoals.length;
          if (sampleGoals.length > 0) {
            await database.savingsGoals.bulkDelete(sampleGoals.map((row) => row.id));
          }

          const sampleEnvelopes = await database.envelopes.filter((row) => row.sample).toArray();
          removed += sampleEnvelopes.length;
          if (sampleEnvelopes.length > 0) {
            await database.envelopes.bulkDelete(sampleEnvelopes.map((row) => row.id));
          }

          const sampleNotes = await database.notes.filter((row) => row.sample).toArray();
          removed += sampleNotes.length;
          if (sampleNotes.length > 0) {
            await database.notes.bulkDelete(sampleNotes.map((row) => row.id));
          }

          const sampleAccounts = await database.accounts.filter((row) => row.sample).toArray();
          const sampleAccountIds = new Set(sampleAccounts.map((row) => row.id));
          if (sampleAccountIds.size > 0) {
            const relink = { accountId: DEFAULT_ACCOUNT_ID, updatedAt: nowIso() };
            await database.transactions
              .filter(
                (row) =>
                  !row.sample && Boolean(row.accountId && sampleAccountIds.has(row.accountId)),
              )
              .modify(relink);
            await database.bills
              .filter(
                (row) =>
                  !row.sample && Boolean(row.accountId && sampleAccountIds.has(row.accountId)),
              )
              .modify(relink);
            await database.incomeSources
              .filter(
                (row) =>
                  !row.sample && Boolean(row.accountId && sampleAccountIds.has(row.accountId)),
              )
              .modify(relink);
            await database.savingsEntries
              .filter(
                (row) =>
                  !row.sample && Boolean(row.accountId && sampleAccountIds.has(row.accountId)),
              )
              .modify(relink);
          }
          removed += sampleAccounts.length;
          if (sampleAccounts.length > 0) {
            await database.accounts.bulkDelete(sampleAccounts.map((row) => row.id));
          }

          await database.settings.update('app', {
            sampleDataLoaded: false,
            updatedAt: nowIso(),
          });
        },
      );
      return { removed };
    },
  };
}

export type SampleRepository = ReturnType<typeof createSampleRepository>;
