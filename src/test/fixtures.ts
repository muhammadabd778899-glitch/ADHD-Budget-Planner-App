import type {
  Bill,
  BillOccurrence,
  Debt,
  IncomeSource,
  SavingsEntry,
  SavingsGoal,
  Settings,
  Transaction,
} from '@/domain/types';

const CREATED = '2026-01-01T00:00:00.000Z';
const UPDATED = '2026-01-01T00:00:00.000Z';

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 'app',
    displayName: '',
    currency: 'USD',
    locale: 'en-US',
    dateFormat: 'medium',
    theme: 'system',
    planMode: 'paycheck',
    startingBalanceMinor: 0,
    cushionMinor: 0,
    onboardingComplete: true,
    sampleDataLoaded: false,
    schemaVersion: 2,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...overrides,
  };
}

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 9)}`,
    type: 'expense',
    amountMinor: 1000,
    date: '2026-03-01',
    description: 'Test transaction',
    categoryId: null,
    notes: '',
    status: 'cleared',
    source: 'manual',
    billId: null,
    billOccurrenceId: null,
    debtId: null,
    incomeSourceId: null,
    sample: false,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...overrides,
  };
}

export function makeIncomeSource(overrides: Partial<IncomeSource> = {}): IncomeSource {
  return {
    id: `inc-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Paycheck',
    amountMinor: 200_000,
    frequency: 'biweekly',
    anchorDate: '2026-03-13',
    endDate: null,
    active: true,
    notes: '',
    sample: false,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...overrides,
  };
}

export function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: `bill-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Rent',
    amountMinor: 25_000,
    frequency: 'monthly',
    anchorDate: '2026-03-11',
    endDate: null,
    categoryId: null,
    autoPay: false,
    notes: '',
    active: true,
    sample: false,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...overrides,
  };
}

export function makeOccurrence(overrides: Partial<BillOccurrence> = {}): BillOccurrence {
  return {
    id: `occ-${Math.random().toString(36).slice(2, 9)}`,
    billId: 'bill-1',
    dueDate: '2026-03-11',
    amountMinor: 25_000,
    status: 'unpaid',
    paidTransactionId: null,
    paidAt: null,
    skippedAt: null,
    sample: false,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...overrides,
  };
}

export function makeSavingsGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: `goal-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Emergency fund',
    targetMinor: 100_000,
    startingMinor: 0,
    targetDate: null,
    color: 'sage',
    notes: '',
    archived: false,
    sample: false,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...overrides,
  };
}

export function makeSavingsEntry(overrides: Partial<SavingsEntry> = {}): SavingsEntry {
  return {
    id: `sav-${Math.random().toString(36).slice(2, 9)}`,
    goalId: 'goal-1',
    amountMinor: 5000,
    date: '2026-03-02',
    note: '',
    sample: false,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...overrides,
  };
}

export function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: `debt-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Credit card',
    kind: 'credit-card',
    balanceMinor: 120_000,
    interestRateBps: 1999,
    minimumPaymentMinor: 5000,
    targetPayoffDate: null,
    notes: '',
    archived: false,
    sample: false,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...overrides,
  };
}
