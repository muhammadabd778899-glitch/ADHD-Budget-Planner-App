export const INCOME_FREQUENCIES = [
  'weekly',
  'biweekly',
  'semimonthly',
  'monthly',
  'one-time',
  'irregular',
] as const;
export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

export const BILL_FREQUENCIES = [
  'weekly',
  'biweekly',
  'semimonthly',
  'monthly',
  'quarterly',
  'yearly',
  'one-time',
] as const;
export type BillFrequency = (typeof BILL_FREQUENCIES)[number];

export const ACCOUNT_KINDS = ['checking', 'savings', 'cash', 'credit'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const SAVINGS_GOAL_KINDS = ['goal', 'sinking'] as const;
export type SavingsGoalKind = (typeof SAVINGS_GOAL_KINDS)[number];

export const NOTE_KINDS = ['brain-dump', 'month'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const TRANSACTION_TYPES = ['expense', 'income'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ['cleared', 'pending'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_SOURCES = ['manual', 'bill', 'debt', 'income', 'sample'] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const BILL_STATUSES = ['unpaid', 'paid', 'skipped'] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const DEBT_KINDS = [
  'credit-card',
  'loan',
  'student-loan',
  'auto',
  'medical',
  'other',
] as const;
export type DebtKind = (typeof DEBT_KINDS)[number];

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const PLAN_MODES = ['paycheck', 'month'] as const;
export type PlanMode = (typeof PLAN_MODES)[number];

export const DATE_FORMATS = ['short', 'medium', 'long'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const CATEGORY_KINDS = ['expense', 'income'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export type DateOnly = string;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface Settings extends Timestamps {
  id: 'app';
  displayName: string;
  currency: string;
  locale: string;
  dateFormat: DateFormat;
  theme: Theme;
  planMode: PlanMode;
  startingBalanceMinor: number;
  cushionMinor: number;
  onboardingComplete: boolean;
  sampleDataLoaded: boolean;
  schemaVersion: number;
}

export interface Account extends Timestamps {
  id: string;
  name: string;
  kind: AccountKind;
  openingBalanceMinor: number;
  archived: boolean;
  sample: boolean;
}

export interface Category extends Timestamps {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  system: boolean;
  archived: boolean;
  sample: boolean;
}

export interface IncomeSource extends Timestamps {
  id: string;
  name: string;
  amountMinor: number;
  frequency: IncomeFrequency;
  anchorDate: DateOnly;
  endDate: DateOnly | null;
  active: boolean;
  accountId: string | null;
  notes: string;
  sample: boolean;
}

export interface Bill extends Timestamps {
  id: string;
  name: string;
  amountMinor: number;
  frequency: BillFrequency;
  anchorDate: DateOnly;
  endDate: DateOnly | null;
  secondDay: number | null;
  categoryId: string | null;
  accountId: string | null;
  autoPay: boolean;
  notes: string;
  active: boolean;
  sample: boolean;
}

export interface BillOccurrence extends Timestamps {
  id: string;
  billId: string;
  dueDate: DateOnly;
  amountMinor: number;
  status: BillStatus;
  paidTransactionId: string | null;
  paidAt: DateOnly | null;
  skippedAt: string | null;
  sample: boolean;
}

export interface Transaction extends Timestamps {
  id: string;
  type: TransactionType;
  amountMinor: number;
  date: DateOnly;
  description: string;
  categoryId: string | null;
  notes: string;
  status: TransactionStatus;
  source: TransactionSource;
  billId: string | null;
  billOccurrenceId: string | null;
  debtId: string | null;
  incomeSourceId: string | null;
  accountId: string | null;
  sample: boolean;
}

export interface Debt extends Timestamps {
  id: string;
  name: string;
  kind: DebtKind;
  balanceMinor: number;
  interestRateBps: number | null;
  minimumPaymentMinor: number | null;
  targetPayoffDate: DateOnly | null;
  notes: string;
  archived: boolean;
  sample: boolean;
}

export interface SavingsGoal extends Timestamps {
  id: string;
  name: string;
  kind: SavingsGoalKind;
  targetMinor: number;
  startingMinor: number;
  monthlyTargetMinor: number;
  autoSavePercent: number;
  targetDate: DateOnly | null;
  color: string;
  notes: string;
  archived: boolean;
  sample: boolean;
}

export interface SavingsEntry extends Timestamps {
  id: string;
  goalId: string;
  amountMinor: number;
  date: DateOnly;
  note: string;
  accountId: string | null;
  sample: boolean;
}

export interface Envelope extends Timestamps {
  id: string;
  name: string;
  categoryId: string;
  monthlyAmountMinor: number;
  rollover: boolean;
  startMonth: string;
  archived: boolean;
  sample: boolean;
}

export interface Note extends Timestamps {
  id: string;
  kind: NoteKind;
  month: string | null;
  text: string;
  pinned: boolean;
  archived: boolean;
  sample: boolean;
}

export interface AppSnapshot {
  settings: Settings;
  accounts: Account[];
  categories: Category[];
  incomeSources: IncomeSource[];
  bills: Bill[];
  billOccurrences: BillOccurrence[];
  transactions: Transaction[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  savingsEntries: SavingsEntry[];
  envelopes: Envelope[];
  notes: Note[];
  storage: StorageHealth;
}

export interface StorageHealth {
  persisted: boolean | null;
  supported: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
}

export interface ProjectedPayday {
  date: DateOnly;
  sourceId: string;
  sourceName: string;
  amountMinor: number;
}

export interface PlannedPayday {
  date: DateOnly;
  totalMinor: number;
  entries: ProjectedPayday[];
}
