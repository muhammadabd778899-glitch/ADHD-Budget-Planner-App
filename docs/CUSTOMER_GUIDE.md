# Customer Guide

## First visit in three steps

1. **Open Tide.** On first load Tide asks for a friendly name, starting balance, and cushion.
2. **Add income.** Enter the name and expected amount of your income and the first expected
   payday. You can skip this for now.
3. **Add what matters.** Add bills, quick-add expenses, savings, or debt. The dashboard always
   shows the one number you need first: safe to spend.

Tide also offers clearly labelled sample data during onboarding if you want to look around before
answering these questions with your own numbers.

## Where the money lives

| Question       | Tide shows                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| Available now  | Starting balance + received income − spending − savings + withdrawals − pending spending (labelled caution). |
| Bills coming   | Unpaid bill occurrences due inside the plan window, with overdue and upcoming states.                        |
| Safe to spend  | Cash on hand − reserved bills − cushion. Expected income is never included.                                  |
| Next best step | A short, calm recommendation derived from the current plan.                                                  |

## How safe to spend is calculated

Tide keeps the arithmetic in one pure function so the dashboard, reports, and help screens cannot
drift apart.

```
cashOnHand = startingBalance + receivedIncome - actualSpending - savingsContributions + savingsWithdrawals
reservedBills = unpaid, non-skipped bill occurrences due through the end of the plan window
safeToSpend = cashOnHand - reservedBills - cushion
safeAfterPending = safeToSpend - pendingExpenses
```

- Money is stored as integer minor units. No floating point arithmetic is used for totals.
- Dates are `YYYY-MM-DD` and use UTC only for calendar arithmetic.
- Expected income is not counted as received income and is never added to safe to spend.

The same numbers are available under **How this is calculated** on the dashboard, and the
calculation is covered by unit tests for normal, negative, zero, pending, and boundary cases.

## Everyday habits

- Quick add an expense from any screen. The form is short by design.
- Mark a bill paid from the Bills screen; Tide creates exactly one expense transaction and stops
  reserving that amount.
- Mark a bill unpaid only when you are sure; the linked expense is removed after confirmation.
- Record debt payments as expenses so cash, debt balance, and reports agree.
- Save a JSON backup whenever you are between machines, before clearing browser data, or after a
  big change.

## Offline use

Tide is installable from the browser’s install prompt. After the first successful load, the app
shell works offline. Offline status is shown in the top bar.

## Support

If something feels wrong with a number, check the calculation explanation on the dashboard and
then confirm your backup before deleting anything.
