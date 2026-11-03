# Harbor

**A calm, local-first budget planner for ADHD brains.**

Harbor answers the questions a person actually asks while planning money:

1. How much do I have available right now?
2. What bills and commitments still need to be covered?
3. How much can I safely spend before my next payday?
4. What should I do next to stay on track?
5. Am I making progress on debt and savings?

Harbor is a planning tool, not a bank, an accountant, or a financial adviser. It stores budget data in the browser, keeps every number derived from source records, and asks one clear question at a time.

## Why Harbor is built this way

- **Local-first.** Your data lives in your browser’s IndexedDB. There is no account, no server, no sync, no bank linking, and no analytics.
- **Calm, not judgmental.** Language is neutral and future-facing. There are no shame-based alerts, no alarmist red walls, and no “you overspent” screens.
- **One obvious action.** Every screen has one primary next action and honest empty states.
- **Trustworthy numbers.** Money is integer minor units; dates are `YYYY-MM-DD`; safe-to-spend is a documented pure formula.
- **Forgiving.** Progressive disclosure, undo for quick captures, explicit confirmations for destructive actions, and no silent resets.
- **Premium and quiet.** A navy “Midnight Harbor” palette with porcelain surfaces, warm gold accents, serif display headings, light and dark themes, and reduced-motion support.

## What Harbor can do

- Dashboard with the safe-to-spend hero, runway to payday, a single “Right now” next action, upcoming bills, recent activity, and progress summaries.
- Focus mode that hides secondary cards without changing any numbers.
- Keyboard shortcuts (`N`, `T`, `B`, `?`) with a shortcut dialog, plus quick-fill amount chips in the expense form.
- Income tracking with weekly, biweekly, semimonthly (1st & 15th), monthly, one-time, and irregular sources; projected paydays; expected vs received income; mark-a-payday-received workflow.
- Bills with recurring and one-time occurrences, semimonthly bills with a custom second due day, deterministic occurrence IDs, paid / skipped / unpaid states, overdue detection, mark-paid and mark-unpaid flows, weekend due-date labels, and a list/calendar view.
- Accounts for checking, savings, cash, and credit balances, with safe to spend viewable per account or across all accounts.
- Spending with quick add, edit, delete/undo, search, and filters, plus monthly category envelopes with optional rollover.
- Debt accounts with recorded payments, history, running balances, an optional labelled payoff estimate, and a suggested payoff focus (highest interest or smallest balance).
- Savings goals and sinking funds with contributions/withdrawals, progress, and a suggested monthly set-aside that is never transferred automatically.
- Brain-dump and pinned month notes for the thoughts that do not belong in a transaction.
- Reports with monthly income/expense totals, category breakdowns, and trends.
- Offline installable PWA, versioned JSON backup/restore, validated preview + safety copy, CSV export with formula-injection protection, labelled removable sample data, dark/light/system themes, accessibility improvements, responsive layout from 320 px.

## Safe to spend

```
cashOnHand   = starting balance + received income − actual spending − savings contributions + savings withdrawals
reservedBills = unpaid, non-skipped bill occurrences due through the end of the plan window
safeToSpend  = cashOnHand − reservedBills − cushion
```

Expected income is never added to safe to spend; it is shown separately as money that is coming in. Pending expenses reduce the final number only through the clearly labelled caution value.

## Quick start

```bash
npm install
npm run dev
```

Then open the printed local URL and complete onboarding in three steps.

## Verification

```bash
npm run verify        # format check, typecheck, lint, unit tests, production build
npm run test:e2e      # Playwright smoke test (starts its own dev server)
npm run preview       # serve the production build
```

CI runs the same checks plus the Playwright smoke test and deploys the production build to GitHub Pages.

## Data safety

- Backups are versioned JSON files created by you.
- Restore requires a validated preview, a downloaded safety copy, and one explicit confirmation.
- Restore runs in a single atomic transaction and leaves existing data unchanged when it fails.
- Sample data is optional, clearly labelled, and removable without touching real records.
- CSV export is plain text; Harbor neutralises spreadsheet formula injection but cannot encrypt the file.

## Support and disclaimers

Harbor is provided for personal planning use. It does not connect to financial institutions, provide financial advice, guarantee affordability, or promise an outcome.

## License and support

Release 1.0 is provided as a static web app. Support questions go through the repository issue tracker.
