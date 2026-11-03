# Harbor — Product Specification

**Product:** Harbor — a calm, local-first budget planner designed for ADHD brains.
**Version:** 1.0
**Status:** Approved baseline for implementation (decisions recorded in `DECISIONS.md`).

---

## 1. Product promise

Harbor helps a person answer five questions in under a minute:

1. How much money do I have available right now?
2. What bills and commitments still need to be covered?
3. How much can I safely spend before my next payday?
4. What should I do next to stay on track?
5. Am I making progress on debt and savings?

Harbor is not a bank, an accounting package, a financial adviser, or a spreadsheet. It is a calm planning surface that makes the next useful action obvious.

## 2. Primary user

A person with ADHD or executive-function friction who:

- is paid on a regular or semi-regular schedule;
- has recurring bills and wants to stop being surprised by them;
- wants to spend less time maintaining a budget, not more;
- has tried spreadsheets or finance apps that felt overwhelming or judgmental;
- values privacy and wants their data to stay on their device.

Secondary user: anyone who wants a simple paycheck-to-paycheck planner without bank linking.

## 3. Experience principles

- **Calm, not judgmental.** Copy is neutral and future-focused. No “you overspent”, no shaming red walls.
- **One obvious next action.** Every screen has a primary action and a clear empty state.
- **Progressive disclosure.** Headline numbers first; the arithmetic is available in an accessible “How this is calculated” disclosure.
- **Fast capture.** Add an expense in four fields or fewer. The quick-add action is reachable from every screen on mobile and desktop.
- **Forgiving workflows.** Explicit confirmations for destructive actions, undo for quick transaction deletion where practical, and no silent data resets.
- **Trustworthy numbers.** Every number is derived from records through a documented pure function.
- **Accessible by default.** Visible focus, semantic landmarks, labelled controls, keyboard support, reduced-motion support, and status announcements.
- **No fake functionality.** No dead controls, placeholder charts, fake sample values presented as real, or unsupported claims.

## 4. Scope

### 4.1 Included in v1

| Area          | Behaviour                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard     | Available now, safe to spend, reserved bills, next payday, upcoming bills, recent activity, progress summaries, calculation explanations |
| Accounts      | Named accounts (checking, savings, cash, credit), optional per-record account, safe to spend per account or across all accounts          |
| Income        | Recurring and one-time income sources, projected paydays, received income records, pause/edit/archive                                    |
| Bills         | Recurring and one-time bills, semimonthly bills with a custom second due day, due occurrences, paid/skipped/unpaid, overdue detection    |
| Spending      | Fast expense entry, editing, deletion with undo, search, filters, categories, monthly envelope limits with optional rollover             |
| Planning      | Paycheck-period and calendar-month planning windows                                                                                      |
| Safe to spend | Documented conservative formula with a user-controlled cushion and optional account scoping                                              |
| Debt          | Debt accounts, current balance, payment recording, payment history, optional estimate with explicit assumptions                          |
| Savings       | Goals and sinking funds, starting amount, contributions, withdrawals, progress, suggested monthly set-aside without automatic transfers  |
| Notes         | Brain-dump notes and pinned month notes, edit, archive, and restore                                                                      |
| Reports       | Month income/expense summary, category breakdown, plan-window summary                                                                    |
| Data          | IndexedDB persistence, versioned JSON backup/restore, CSV export, sample data that is labelled and removable                             |
| Offline       | Installable PWA, app-shell caching, offline CRUD, user-consented update prompt                                                           |
| Settings      | Name, currency, locale, date format, appearance, starting balance, cushion, planning window, categories, data tools                      |

### 4.2 Explicitly out of scope

- Bank connections, scraping, or automatic imports
- Cloud accounts, cross-device sync, multi-user households
- Subscription billing or payments inside the app
- Investment, credit-score, tax, or lending features
- AI advice or automated financial recommendations
- Guaranteed payoff dates or financial outcomes
- Encryption claims (data is stored locally but not encrypted by Harbor)
- Automatic backups (the user initiates backups)

## 5. Information architecture

Desktop: persistent left sidebar grouped into **Today**, **Plan**, **Track**, **Review**, with **Settings** pinned to the bottom. A top strip shows local-save status and a quick-add button.

Mobile: bottom navigation with **Today**, **Bills**, **Add**, **Spending**, and **More**. More opens a sheet containing Paydays, Debt, Savings, Reports, and Settings. Touch targets are at least 44×44 CSS pixels.

Primary routes:

- `/` Dashboard
- `/income` Paydays
- `/bills` Bills
- `/spending` Spending
- `/debt` Debt
- `/savings` Savings
- `/notes` Brain dump and month notes
- `/reports` Reports
- `/settings` Settings
- `/help` How Harbor works
- `/onboarding` first-run flow
- `*` not found

## 6. Financial definitions (approved v1)

All money is stored as integer **minor units** (cents for USD). All dates are date-only `YYYY-MM-DD` strings interpreted in the user’s local calendar without timezone conversion.

### 6.1 Records

- **Received income**: a cleared transaction with `type = income` and a date on or before today. Expected paydays are never counted as received income.
- **Actual spending**: a cleared transaction with `type = expense` and a date on or before today. Pending transactions are shown separately and are not counted in available cash.
- **Cash on hand**: `startingBalance + received income − actual spending − savings contributions + savings withdrawals` using all records dated on or before today.
  - A savings contribution is a transfer out of spendable cash.
  - A debt payment is an expense transaction and therefore reduces cash on hand.
  - Bills paid through Harbor create exactly one expense transaction; marking a bill unpaid removes that transaction after confirmation.
- **Reserved bills**: the sum of unpaid, non-skipped bill occurrences with `dueDate <= periodEnd`. Overdue unpaid occurrences are included. Paid and skipped occurrences are excluded.
- **Cushion**: a user-set amount (`cushionMinor`) representing money they want to leave untouched. It is the reserved savings component of the safe-to-spend formula.
- **Planning window**:
  - **Until next payday** (default): from today through the day before the next projected payday strictly after today. If no active income schedule exists, the window ends on the last day of the current month.
  - **This month**: from today through the last day of the current month.
- **Pending spending**: cleared-from-cash? No. Pending expenses are excluded from `cashOnHand`; the dashboard shows `safeToSpendAfterPending = safeToSpend − pendingExpenses` as an optional, clearly labelled caution value.

### 6.2 Safe to spend

```
cashOnHand   = startingBalance
             + receivedIncome (date <= today, status = cleared)
             − actualSpending (date <= today, status = cleared)
             − savingsContributions (date <= today)
             + savingsWithdrawals (date <= today)

reservedBills = Σ unpaid, non-skipped bill occurrences with dueDate <= periodEnd

safeToSpend   = cashOnHand − reservedBills − cushionMinor
```

`cashOnHand` may be negative. `safeToSpend` may be negative; it is displayed as “Over plan by …” with calm styling, never as an error.

**Accounts.** “All accounts” uses the formula above across every record. A single account uses only its own records (records with a null `accountId` belong to the main account). The main account uses `settings.startingBalanceMinor` and `settings.cushionMinor`; a secondary account uses its own opening balance and a cushion of zero, because the cushion is a plan-wide reserve.

Expected income is **not** included in safe to spend. This is deliberately conservative: Harbor never lets a future payday make today’s number look safer than it is. Expected income is shown separately as “Coming in”.

### 6.3 Planning period and paydays

- Projections are generated from active income sources using their recurrence rule.
- The next payday is the earliest projected date strictly after today.
- A projected payday can be marked received, which opens a prefilled income transaction. The projection remains a projection; received income is the transaction.
- One-time sources project only their anchor date. Irregular sources have no projection; the user records income manually.
- Expected income in the plan window is reported separately and never netted into safe to spend.

### 6.4 Bills and recurrence

- Occurrences are materialised lazily for a rolling horizon of 18 months back through 24 months forward.
- A recurring bill’s occurrence identity is deterministic: `<billId>__<dueDate>`.
- Monthly dates clamp to the last day of shorter months (for example, the 31st becomes the 30th in April).
- Semimonthly bills occur on the 1st and on a second day the user chooses (2–31, default 15). The second day also clamps to the last day of shorter months.
- Leap years are handled by calendar arithmetic, not fixed day counts.
- Status is `unpaid`, `paid`, or `skipped`; **overdue** is derived (`unpaid` and `dueDate < today`) and is not a stored status.
- Marking paid records the occurrence’s amount as one expense transaction on the payment date (default today) and links both records. Double counting is prevented because safe-to-spend reserves unpaid occurrences only and actual spending counts the linked transaction.
- Marking unpaid removes the linked transaction after confirmation and returns the occurrence to unpaid.
- Changing a bill:
  - Paid and skipped occurrences are preserved.
  - Unpaid occurrences on or after the effective date (default today) are regenerated from the new rule and amount.
  - Historical transactions are never rewritten.
- Archiving a bill keeps paid/skipped history and past unpaid occurrences, and removes future unpaid occurrences so they no longer reserve money.
- Deleting a transaction linked to a paid bill is blocked; the user must mark the bill unpaid first. This preserves the bill–payment relationship.

### 6.5 Debt

- A debt stores `balanceMinor` at the time it is added.
- Current balance = `balanceMinor − Σ cleared expense transactions linked to the debt` (minimum zero is **not** forced; overpayment shows as a negative balance and is labelled clearly).
- Payments are expense transactions linked by `debtId`; they reduce cash on hand and debt balance. A bill may also be paid with a debt link only through the debt payment flow; v1 keeps debt payments separate from bill occurrences.
- The optional payoff estimate uses the entered annual interest rate and minimum payment, assumes monthly compounding and a constant payment, and is labelled “Estimate only — not a promise”.
- No interest is automatically posted. The user records actual payments and may update the balance when needed.

### 6.6 Savings

- A goal stores `startingMinor` (already saved when created) and `targetMinor`.
- Current amount = `startingMinor + Σ entries` where positive entries are contributions and negative entries are withdrawals.
- Contributions reduce cash on hand because they are transfers to savings.
- Progress is capped visually at 100% but the underlying amount can exceed the target.
- Savings entries are not spending and are excluded from expense reports.
- A **sinking fund** is a savings goal for a recurring annual expense (for example, gifts) and can also store a monthly target or a share of received income.
- The suggested set-aside is the monthly target, or `autoSavePercent` of cleared income received this month when that is set, minus contributions already made this month. It can be `$0`.
- A suggestion prefills the contribution dialog when the user chooses **Set aside**. Harbor never moves money automatically.

### 6.7 Envelopes

- An envelope sets a monthly limit for one expense category and may carry unused money into the next month.
- Spending is derived from cleared expense transactions in that category for the month. Pending transactions are shown in the transaction list but do not count against an envelope.
- Envelopes are guidance. They do not reserve cash and do not change safe to spend.
- Only one active envelope may exist per category.
- Overspending is shown as a calm “over by” amount, never as an error.

### 6.8 Notes

- A note is either a **brain dump** (free text, optionally pinned) or a **month note** tied to one `YYYY-MM`.
- Notes are plain text, stored locally, and capped at 4,000 characters. Harbor renders them without HTML.
- Notes can be edited, pinned, archived, and restored. Archived notes never appear in the main list.
- Notes are not financial records and never affect calculations.

### 6.9 Reports

- Monthly totals use transactions with dates inside the calendar month and `status = cleared`. Pending totals are shown separately.
- Category breakdown excludes uncategorised into a labelled “Uncategorised” row.
- Report figures are derived from the same pure domain functions as the dashboard.

## 7. Data safety and privacy

- Data stays in the browser’s IndexedDB. Harbor does not send data to a server, load remote fonts, use analytics, or require a runtime CDN.
- JSON backups are versioned and validated before restore. Restore requires an explicit confirmation and a downloaded safety copy of current data.
- Restore runs in a single IndexedDB transaction. A failure leaves existing data unchanged.
- The app never silently seeds over existing data. Sample data is optional, clearly labelled, and uses IDs prefixed `sample-`.
- Removing sample data deletes only records marked `sample` (or prefixed `sample-`), never real records.
- A storage-health check shows whether persistent storage was granted and surfaces quota errors in plain language.

## 8. Accessibility and responsive requirements

- WCAG 2.2 AA contrast targets for text and controls.
- Semantic landmarks, heading order, skip link, visible focus, and logical focus order.
- Native `<dialog>` for modals with Escape and focus trapping; focus returns to the trigger.
- All form fields have labels; errors use `aria-describedby` and `aria-invalid`; the first error receives focus on submit.
- Status changes are announced through an ARIA live region.
- Status is never communicated by colour alone (icon + text).
- `prefers-reduced-motion` disables non-essential transitions.
- Layout works from 320 px to large desktop. Tap targets at least 44 px.
- Charts have text alternatives and underlying data lists.

## 9. Offline and installation

- Installable PWA with an app-shell service worker.
- Core workflows work offline after the first successful online load.
- Updates are offered, not forced. The user can choose “Reload now” or “Later”; the app does not discard unsaved form work.
- Offline status is visible when the browser reports it.
- No runtime network calls are required for core functionality.

## 10. Content and tone

- Use second person, plain language, and short sentences.
- Prefer “Unpaid”, “Due soon”, “Reserved”, “Safe to spend”.
- Avoid “Failed”, “Error” as the only message; explain what happened and the next step.
- Empty states explain one small next step.
- Financial explanations are available in-app through “How this is calculated”.

## 11. Definition of done for v1

- A new user can complete onboarding, add income, add a bill, add expenses, understand safe to spend, and create a backup without help.
- All financial calculations are pure, documented, and tested, including month-end, leap-year, negative, zero, duplicate-payment, and pending cases.
- Data survives reload, browser restart, and offline use.
- Backup, restore, and CSV export work from the production build and fail safely.
- Keyboard-only and screen-reader smoke tests pass on core workflows.
- Every major screen has empty, loading, error, and success states.
- No dead controls or unsupported claims.
- `npm run verify` passes and the production build is tested in a clean browser profile.
