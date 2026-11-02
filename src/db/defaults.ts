import type { Category, DateFormat, Settings } from '@/domain/types';
import { nowIso } from '@/lib/ids';

export const DEFAULT_CATEGORIES: Array<Omit<Category, 'createdAt' | 'updatedAt'>> = [
  {
    id: 'cat-groceries',
    name: 'Groceries',
    kind: 'expense',
    color: 'sage',
    icon: 'basket',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-home',
    name: 'Home',
    kind: 'expense',
    color: 'clay',
    icon: 'home',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-transport',
    name: 'Transport',
    kind: 'expense',
    color: 'sky',
    icon: 'bus',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-health',
    name: 'Health',
    kind: 'expense',
    color: 'rose',
    icon: 'heart',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-fun',
    name: 'Fun',
    kind: 'expense',
    color: 'lavender',
    icon: 'sparkle',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-bills',
    name: 'Bills',
    kind: 'expense',
    color: 'gold',
    icon: 'receipt',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-debt',
    name: 'Debt',
    kind: 'expense',
    color: 'rose',
    icon: 'card',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-other',
    name: 'Other',
    kind: 'expense',
    color: 'stone',
    icon: 'dot',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-income-paycheck',
    name: 'Paycheck',
    kind: 'income',
    color: 'sage',
    icon: 'wallet',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-income-side',
    name: 'Side income',
    kind: 'income',
    color: 'sky',
    icon: 'sparkle',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-income-refund',
    name: 'Refund',
    kind: 'income',
    color: 'gold',
    icon: 'arrow-down',
    system: true,
    archived: false,
    sample: false,
  },
  {
    id: 'cat-income-other',
    name: 'Other income',
    kind: 'income',
    color: 'stone',
    icon: 'dot',
    system: true,
    archived: false,
    sample: false,
  },
];

export function browserLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}

export function defaultDateFormat(locale: string): DateFormat {
  if (locale.startsWith('en-US')) return 'medium';
  return 'medium';
}

export function defaultSettings(): Settings {
  const now = nowIso();
  const locale = browserLocale();
  return {
    id: 'app',
    displayName: '',
    currency: 'USD',
    locale,
    dateFormat: defaultDateFormat(locale),
    theme: 'system',
    planMode: 'paycheck',
    startingBalanceMinor: 0,
    cushionMinor: 0,
    onboardingComplete: false,
    sampleDataLoaded: false,
    schemaVersion: 2,
    createdAt: now,
    updatedAt: now,
  };
}

export function categoryById(categories: Category[], id: string | null): Category | undefined {
  if (!id) return undefined;
  return categories.find((category) => category.id === id);
}
