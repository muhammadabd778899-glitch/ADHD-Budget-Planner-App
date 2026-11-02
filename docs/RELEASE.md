# Financial Audit and Release Notes

## Approved v1 formula

See `docs/PRODUCT_SPEC.md` section 6 and the dashboard disclosure.

```
cashOnHand   = startingBalance + receivedIncome − actualSpending − savingsContributions + savingsWithdrawals
reservedBills = unpaid, non-skipped bill occurrences due through period end
safeToSpend  = cashOnHand − reservedBills − cushion
```

- Received income: cleared income transaction dated on or before today. Expected paydays are not
  received income.
- Actual spending: cleared expense dated on or before today.
- Pending expenses are excluded from cash and surfaced as a labelled caution.
- Savings contributions reduce cash; withdrawals restore cash; they are not spending.
- Debt payments are expense transactions linked to the debt and therefore reduce cash.
- Bills paid through Tide become one linked expense transaction; marking unpaid removes it after
  confirmation.
- Expected income is reported separately and never enters safe to spend.

## Edge cases covered

- Money as integer minor units; no floating point financial totals.
- Negative cash on hand and negative safe-to-spend are displayed calmly.
- Zero cushion, zero starting balance, zero payments, and zero savings goals.
- Overpayment shows a negative debt balance and is labelled.
- Monthly recurrence clamps to the last valid day; leap years are handled by calendar arithmetic.
- Semimonthly uses the 1st and 15th.
- Pending vs cleared and future-dated transactions are handled distinctly.

## Release checklist

- [x] Financial calculation audit documented.
- [x] Regression checklist in `docs/ACCEPTANCE_CRITERIA.md`.
- [x] Fresh-buyer simulation steps in `docs/FRESH_BUYER_SIMULATION.md`.
- [x] Full verification pipeline passes.
- [x] Version `1.0.0` recorded in `package.json`.
- [x] Backup format version `1`, database schema version `2`.
- [x] Production build contains PWA manifest, icons, service worker, and app shell.

## Known limitations at release

- No bank sync, AI advice, cloud sync, subscriptions, or investment features.
- No encryption; data is local to the browser only.
- Public deployment requires GitHub Pages enablement by the repository owner.
