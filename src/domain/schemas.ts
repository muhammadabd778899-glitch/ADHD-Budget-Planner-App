import { z } from 'zod';
import {
  BILL_FREQUENCIES,
  BILL_STATUSES,
  CATEGORY_KINDS,
  DATE_FORMATS,
  DEBT_KINDS,
  INCOME_FREQUENCIES,
  PLAN_MODES,
  THEMES,
  TRANSACTION_SOURCES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '@/domain/types';
import { isValidDateOnly } from '@/lib/dates';

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format')
  .refine(isValidDateOnly, 'Enter a valid calendar date');

export const idSchema = z.string().min(1).max(160);
export const timestampSchema = z.string().min(10).max(40);

const timestamps = {
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
};

const moneyNonNegative = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const moneyPositive = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);

export const settingsSchema = z
  .object({
    id: z.literal('app'),
    displayName: z.string().max(80),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, 'Use a three-letter currency code')
      .default('USD'),
    locale: z.string().min(2).max(35),
    dateFormat: z.enum(DATE_FORMATS),
    theme: z.enum(THEMES),
    planMode: z.enum(PLAN_MODES),
    startingBalanceMinor: moneyNonNegative,
    cushionMinor: moneyNonNegative,
    onboardingComplete: z.boolean(),
    sampleDataLoaded: z.boolean(),
    schemaVersion: z.number().int().min(1),
    ...timestamps,
  })
  .strict();

export const categorySchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1, 'Name is required').max(40),
    kind: z.enum(CATEGORY_KINDS),
    color: z.string().min(1).max(30),
    icon: z.string().min(1).max(30),
    system: z.boolean(),
    archived: z.boolean(),
    sample: z.boolean(),
    ...timestamps,
  })
  .strict();

export const incomeSourceSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1, 'Name is required').max(60),
    amountMinor: moneyNonNegative,
    frequency: z.enum(INCOME_FREQUENCIES),
    anchorDate: dateOnlySchema,
    endDate: dateOnlySchema.nullable(),
    active: z.boolean(),
    notes: z.string().max(500),
    sample: z.boolean(),
    ...timestamps,
  })
  .strict();

export const billSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1, 'Name is required').max(60),
    amountMinor: moneyPositive,
    frequency: z.enum(BILL_FREQUENCIES),
    anchorDate: dateOnlySchema,
    endDate: dateOnlySchema.nullable(),
    categoryId: idSchema.nullable(),
    autoPay: z.boolean(),
    notes: z.string().max(500),
    active: z.boolean(),
    sample: z.boolean(),
    ...timestamps,
  })
  .strict();

export const billOccurrenceSchema = z
  .object({
    id: idSchema,
    billId: idSchema,
    dueDate: dateOnlySchema,
    amountMinor: moneyNonNegative,
    status: z.enum(BILL_STATUSES),
    paidTransactionId: idSchema.nullable(),
    paidAt: dateOnlySchema.nullable(),
    skippedAt: timestampSchema.nullable(),
    sample: z.boolean(),
    ...timestamps,
  })
  .strict();

export const transactionSchema = z
  .object({
    id: idSchema,
    type: z.enum(TRANSACTION_TYPES),
    amountMinor: moneyPositive,
    date: dateOnlySchema,
    description: z.string().trim().min(1, 'Description is required').max(120),
    categoryId: idSchema.nullable(),
    notes: z.string().max(500),
    status: z.enum(TRANSACTION_STATUSES),
    source: z.enum(TRANSACTION_SOURCES),
    billId: idSchema.nullable(),
    billOccurrenceId: idSchema.nullable(),
    debtId: idSchema.nullable(),
    incomeSourceId: idSchema.nullable(),
    sample: z.boolean(),
    ...timestamps,
  })
  .strict();

export const debtSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1, 'Name is required').max(60),
    kind: z.enum(DEBT_KINDS),
    balanceMinor: moneyNonNegative,
    interestRateBps: z.number().int().min(0).max(10_000).nullable(),
    minimumPaymentMinor: moneyNonNegative.nullable(),
    targetPayoffDate: dateOnlySchema.nullable(),
    notes: z.string().max(500),
    archived: z.boolean(),
    sample: z.boolean(),
    ...timestamps,
  })
  .strict();

export const savingsGoalSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1, 'Name is required').max(60),
    targetMinor: moneyPositive,
    startingMinor: moneyNonNegative,
    targetDate: dateOnlySchema.nullable(),
    color: z.string().min(1).max(30),
    notes: z.string().max(500),
    archived: z.boolean(),
    sample: z.boolean(),
    ...timestamps,
  })
  .strict();

export const savingsEntrySchema = z
  .object({
    id: idSchema,
    goalId: idSchema,
    amountMinor: z
      .number()
      .int()
      .refine((value) => value !== 0, 'Amount cannot be zero')
      .refine((value) => Number.isSafeInteger(value), 'Amount is too large'),
    date: dateOnlySchema,
    note: z.string().max(200),
    sample: z.boolean(),
    ...timestamps,
  })
  .strict();

export const backupPayloadSchema = z
  .object({
    settings: settingsSchema,
    categories: z.array(categorySchema),
    incomeSources: z.array(incomeSourceSchema),
    bills: z.array(billSchema),
    billOccurrences: z.array(billOccurrenceSchema),
    transactions: z.array(transactionSchema),
    debts: z.array(debtSchema),
    savingsGoals: z.array(savingsGoalSchema),
    savingsEntries: z.array(savingsEntrySchema),
  })
  .strict();

export const backupSchema = z
  .object({
    format: z.literal('tide-backup'),
    version: z.literal(1),
    exportedAt: timestampSchema,
    appVersion: z.string().min(1).max(40),
    counts: z.record(z.string(), z.number().int().min(0)).optional(),
    data: backupPayloadSchema,
  })
  .strict();

export type BackupFile = z.infer<typeof backupSchema>;
export type BackupPayload = z.infer<typeof backupPayloadSchema>;

export const transactionFormSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: z.string().min(1, 'Enter an amount'),
  date: dateOnlySchema,
  description: z.string().trim().min(1, 'Add a short description').max(120),
  categoryId: z.string().nullable(),
  notes: z.string().max(500),
  status: z.enum(TRANSACTION_STATUSES),
});

export const incomeSourceFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  amount: z.string().min(1, 'Enter an amount'),
  frequency: z.enum(INCOME_FREQUENCIES),
  anchorDate: dateOnlySchema,
  endDate: z.union([dateOnlySchema, z.literal('')]),
  notes: z.string().max(500),
});

export const billFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  amount: z.string().min(1, 'Enter an amount'),
  frequency: z.enum(BILL_FREQUENCIES),
  anchorDate: dateOnlySchema,
  endDate: z.union([dateOnlySchema, z.literal('')]),
  categoryId: z.string().nullable(),
  autoPay: z.boolean(),
  notes: z.string().max(500),
});

export const debtFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  kind: z.enum(DEBT_KINDS),
  balance: z.string().min(1, 'Enter a balance'),
  interestRate: z.string().max(12),
  minimumPayment: z.string().max(20),
  targetPayoffDate: z.union([dateOnlySchema, z.literal('')]),
  notes: z.string().max(500),
});

export const savingsGoalFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  target: z.string().min(1, 'Enter a target'),
  starting: z.string().min(1, 'Enter an amount'),
  targetDate: z.union([dateOnlySchema, z.literal('')]),
  color: z.string().min(1).max(30),
  notes: z.string().max(500),
});
