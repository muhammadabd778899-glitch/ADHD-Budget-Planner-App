import type { Account, AppSnapshot, DateOnly, Settings } from '@/domain/types';
import type { SafeToSpendInput } from '@/domain/safeToSpend';

export const DEFAULT_ACCOUNT_ID = 'acct-main';

export function accountName(accounts: Account[], accountId: string | null): string {
  if (!accountId) {
    return accounts.find((account) => account.id === DEFAULT_ACCOUNT_ID)?.name ?? 'Main account';
  }
  return accounts.find((account) => account.id === accountId)?.name ?? 'Removed account';
}

export function belongsToAccount(
  recordAccountId: string | null | undefined,
  accountId: string,
): boolean {
  return (recordAccountId ?? DEFAULT_ACCOUNT_ID) === accountId;
}

/**
 * Builds the safe-to-spend input for a single account. The main account uses
 * the starting balance and cushion from Settings so existing plans keep the
 * same meaning; every other account uses its own opening balance.
 */
export function accountSafeToSpendInput(
  snapshot: AppSnapshot,
  accountId: string,
  today: DateOnly,
): SafeToSpendInput {
  const isMain = accountId === DEFAULT_ACCOUNT_ID;
  const account = snapshot.accounts.find((row) => row.id === accountId);
  const settings: Settings = {
    ...snapshot.settings,
    startingBalanceMinor: isMain
      ? snapshot.settings.startingBalanceMinor
      : (account?.openingBalanceMinor ?? 0),
    cushionMinor: isMain ? snapshot.settings.cushionMinor : 0,
  };
  const bills = snapshot.bills.filter((bill) => belongsToAccount(bill.accountId, accountId));
  const billIds = new Set(bills.map((bill) => bill.id));
  return {
    settings,
    transactions: snapshot.transactions.filter((transaction) =>
      belongsToAccount(transaction.accountId, accountId),
    ),
    savingsEntries: snapshot.savingsEntries.filter((entry) =>
      belongsToAccount(entry.accountId, accountId),
    ),
    billOccurrences: snapshot.billOccurrences.filter((occurrence) =>
      billIds.has(occurrence.billId),
    ),
    bills,
    incomeSources: snapshot.incomeSources.filter((source) =>
      belongsToAccount(source.accountId, accountId),
    ),
    today,
  };
}
