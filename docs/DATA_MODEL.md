# Data Model

All timestamps are ISO-8601 UTC strings. All date-only fields are `YYYY-MM-DD`. All money fields are integer minor units (e.g. cents). All records have `createdAt` and `updatedAt`.

## Entity overview

```
settings (single record)
categories ─────────────┐
incomeSources           │
bills ──< billOccurrences ──> transactions (payment)
transactions ──> debts (optional)
transactions ──> categories (optional)
savingsGoals ──< savingsEntries
```

## `settings` (primary key: `id = "app"`)

| Field                    | Type                            | Notes                                                      |
| ------------------------ | ------------------------------- | ---------------------------------------------------------- |
| `id`                     | `"app"`                         | singleton                                                  |
| `displayName`            | string                          | optional, used in greeting                                 |
| `currency`               | ISO 4217 string                 | default `USD`; changing it does not convert stored amounts |
| `locale`                 | BCP-47 string                   | default browser locale or `en-US`                          |
| `dateFormat`             | `"short" \| "medium" \| "long"` | display only                                               |
| `theme`                  | `"light" \| "dark" \| "system"` | appearance                                                 |
| `planMode`               | `"paycheck" \| "month"`         | default `paycheck`                                         |
| `startingBalanceMinor`   | integer                         | cash on hand before tracked records                        |
| `cushionMinor`           | integer ≥ 0                     | money kept untouched                                       |
| `onboardingComplete`     | boolean                         | gates first-run flow                                       |
| `sampleDataLoaded`       | boolean                         | whether sample records are currently present               |
| `createdAt`, `updatedAt` | ISO string                      |                                                            |

## `categories`

| Field      | Type                    | Notes                                                                     |
| ---------- | ----------------------- | ------------------------------------------------------------------------- |
| `id`       | string                  |                                                                           |
| `name`     | string (1–40)           | unique case-insensitively in the app layer                                |
| `kind`     | `"expense" \| "income"` |                                                                           |
| `color`    | string                  | token key such as `sage`, `apricot`                                       |
| `icon`     | string                  | icon key                                                                  |
| `system`   | boolean                 | default categories cannot be renamed? (they can be archived, not deleted) |
| `archived` | boolean                 | hidden from pickers                                                       |
| `sample`   | boolean                 | sample-data isolation                                                     |
| timestamps |                         |                                                                           |

Default expense categories: Groceries, Home, Transport, Health, Fun, Bills, Debt, Other.
Default income categories: Paycheck, Side income, Refund, Other income.

## `incomeSources`

| Field         | Type                                                                    | Notes                                                  |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `id`          | string                                                                  |                                                        |
| `name`        | string (1–60)                                                           |                                                        |
| `amountMinor` | integer ≥ 0                                                             | expected amount                                        |
| `frequency`   | `weekly \| biweekly \| semimonthly \| monthly \| one-time \| irregular` |                                                        |
| `anchorDate`  | date                                                                    | first expected date; semimonthly uses the 1st and 15th |
| `endDate`     | date \| null                                                            | inclusive stop                                         |
| `active`      | boolean                                                                 | paused sources do not project                          |
| `notes`       | string                                                                  | optional                                               |
| `sample`      | boolean                                                                 |                                                        |
| timestamps    |                                                                         |                                                        |

Received income is **not** stored here; it is an income transaction.

## `bills`

| Field         | Type                                                               | Notes                                          |
| ------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| `id`          | string                                                             |                                                |
| `name`        | string (1–60)                                                      |                                                |
| `amountMinor` | integer ≥ 0                                                        | expected amount                                |
| `frequency`   | `weekly \| biweekly \| monthly \| quarterly \| yearly \| one-time` |                                                |
| `anchorDate`  | date                                                               | first due date                                 |
| `endDate`     | date \| null                                                       | inclusive stop                                 |
| `categoryId`  | string \| null                                                     | must exist if set                              |
| `autoPay`     | boolean                                                            | informational only                             |
| `notes`       | string                                                             |                                                |
| `active`      | boolean                                                            | archived bills do not generate new occurrences |
| `sample`      | boolean                                                            |                                                |
| timestamps    |                                                                    |                                                |

## `billOccurrences`

| Field               | Type                        | Notes                                           |
| ------------------- | --------------------------- | ----------------------------------------------- |
| `id`                | string                      | deterministic `billId__dueDate`                 |
| `billId`            | string                      | FK                                              |
| `dueDate`           | date                        |                                                 |
| `amountMinor`       | integer ≥ 0                 | snapshot of the bill amount for this occurrence |
| `status`            | `unpaid \| paid \| skipped` | overdue is derived                              |
| `paidTransactionId` | string \| null              | FK to transactions                              |
| `paidAt`            | date \| null                | payment date                                    |
| `skippedAt`         | ISO string \| null          |                                                 |
| `sample`            | boolean                     |                                                 |
| timestamps          |                             |                                                 |

Unique index on `[billId+dueDate]` and `id` is deterministic.

## `transactions`

| Field              | Type                                         | Notes                                        |
| ------------------ | -------------------------------------------- | -------------------------------------------- |
| `id`               | string                                       |                                              |
| `type`             | `expense \| income`                          |                                              |
| `amountMinor`      | integer > 0                                  | always positive; type carries direction      |
| `date`             | date                                         |                                              |
| `description`      | string (1–120)                               |                                              |
| `categoryId`       | string \| null                               | FK                                           |
| `notes`            | string                                       |                                              |
| `status`           | `cleared \| pending`                         | pending excluded from cash calculations      |
| `source`           | `manual \| bill \| debt \| income \| sample` | provenance                                   |
| `billId`           | string \| null                               | set for bill payments                        |
| `billOccurrenceId` | string \| null                               | unique for bill payments                     |
| `debtId`           | string \| null                               | set for debt payments                        |
| `incomeSourceId`   | string \| null                               | set when marking a projected payday received |
| `sample`           | boolean                                      |                                              |
| timestamps         |                                              |                                              |

Rules:

- A transaction with `billOccurrenceId` cannot be deleted directly; mark the bill unpaid first.
- A transaction with `debtId` is an expense and reduces the debt balance.
- Only one transaction may reference a given `billOccurrenceId` (enforced by repository check and transaction).

## `debts`

| Field                 | Type                                                              | Notes                       |
| --------------------- | ----------------------------------------------------------------- | --------------------------- |
| `id`                  | string                                                            |                             |
| `name`                | string                                                            |                             |
| `kind`                | `credit-card \| loan \| student-loan \| auto \| medical \| other` |                             |
| `balanceMinor`        | integer ≥ 0                                                       | balance when added          |
| `interestRateBps`     | integer ≥ 0 \| null                                               | annual rate in basis points |
| `minimumPaymentMinor` | integer ≥ 0 \| null                                               | used only for estimates     |
| `targetPayoffDate`    | date \| null                                                      | informational               |
| `notes`               | string                                                            |                             |
| `archived`            | boolean                                                           | hidden, history retained    |
| `sample`              | boolean                                                           |                             |
| timestamps            |                                                                   |                             |

Current balance is derived: `balanceMinor − Σ expense transactions with debtId` (cleared and pending? cleared only; pending payments are shown as pending). Overpayment can produce a negative derived balance; display “Credit balance” rather than forcing zero.

## `savingsGoals`

| Field           | Type         | Notes                      |
| --------------- | ------------ | -------------------------- |
| `id`            | string       |                            |
| `name`          | string       |                            |
| `targetMinor`   | integer > 0  |                            |
| `startingMinor` | integer ≥ 0  | already saved when created |
| `targetDate`    | date \| null |                            |
| `color`         | string       | token key                  |
| `notes`         | string       |                            |
| `archived`      | boolean      |                            |
| `sample`        | boolean      |                            |
| timestamps      |              |                            |

## `savingsEntries`

| Field         | Type        | Notes                                          |
| ------------- | ----------- | ---------------------------------------------- |
| `id`          | string      |                                                |
| `goalId`      | string      | FK                                             |
| `amountMinor` | integer ≠ 0 | positive = contribution, negative = withdrawal |
| `date`        | date        |                                                |
| `note`        | string      |                                                |
| `sample`      | boolean     |                                                |
| timestamps    |             |                                                |

## Backup format (`tide-backup`)

```json
{
  "format": "tide-backup",
  "version": 1,
  "exportedAt": "2026-11-02T10:00:00.000Z",
  "appVersion": "1.0.0",
  "counts": { "transactions": 42 },
  "data": {
    "settings": {},
    "categories": [],
    "incomeSources": [],
    "bills": [],
    "billOccurrences": [],
    "transactions": [],
    "debts": [],
    "savingsGoals": [],
    "savingsEntries": []
  }
}
```

Validation checks: format, version, size (≤ 15 MB), entity schemas, unique IDs, referential integrity, occurrence–transaction one-to-one, category kinds, and settings singleton. A restore replaces all tables in one transaction. Unknown future versions are rejected with a clear message.

## Migration policy

- Dexie schema versions are declared in `src/db/database.ts`.
- A version upgrade may add stores/indexes or transform data, but must never drop user records silently.
- Migration logic is pure where possible and exercised by tests using an old-version database.
- Backup format versions are independent of IndexedDB versions.
- Sample data is always identifiable through `sample: true` and `sample-` ID prefixes; sample removal is scoped to those records.
