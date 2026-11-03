# Architecture

## Stack

| Concern     | Choice                                                            |
| ----------- | ----------------------------------------------------------------- |
| UI          | React 19 + TypeScript (strict)                                    |
| Build       | Vite 7                                                            |
| Routing     | React Router 7 (`HashRouter` for static-host reliability)         |
| Styling     | Design-token CSS + component classes (local, offline, no CDN)     |
| Validation  | Zod 4 at every trust boundary                                     |
| Storage     | IndexedDB through Dexie 4                                         |
| Domain      | Pure TypeScript modules in `src/domain` and `src/lib`             |
| Persistence | `createRepositories()` typed repositories; UI never imports Dexie |
| Tests       | Vitest, Testing Library, fake-indexeddb                           |
| E2E         | Playwright (smoke/critical workflows)                             |
| PWA         | vite-plugin-pwa / Workbox                                         |
| CI          | GitHub Actions                                                    |
| Hosting     | Static HTTPS (GitHub Pages workflow included)                     |

## Layers

```
Pages / components
      │  (read models + actions from AppDataProvider)
      ▼
State (AppDataProvider)  ──► pure projections / domain calculations
      │
      ▼
Repositories (typed, transactional)
      │
      ▼
Dexie / IndexedDB
```

- **UI components never import `db` or Dexie.** They call actions exposed by `AppDataProvider`.
- **Repositories** own reads/writes, transactions, validation, and sample-data isolation.
- **Domain modules** are pure and have no React or Dexie imports. They own money, dates, recurrence, plan windows, safe-to-spend, debt, savings, CSV encoding, and projections.
- **Zod schemas** validate records entering or leaving persistence and all imported backup files.
- **AppDataProvider** loads a bounded snapshot (transactions are currently fully loaded for search; the bill occurrence horizon is rolling) and refreshes after each mutation. It also exposes derived read models computed by pure functions.

## Data flow for a bill payment

1. User selects “Mark paid” on an occurrence.
2. Repository opens a Dexie read-write transaction spanning `billOccurrences` and `transactions`.
3. It validates the occurrence is still unpaid, creates one expense transaction with `billId`/`billOccurrenceId`, updates the occurrence to paid with `paidTransactionId`, and commits.
4. Provider refreshes. Safe-to-spend no longer reserves that occurrence and actual spending includes the transaction exactly once.
5. A failure rolls the whole transaction back; the occurrence remains unpaid.

## Data flow for restore

1. User selects a JSON file.
2. The file is size-limited, parsed, and validated with the versioned backup schema, including IDs, relationships, and enums.
3. The UI previews counts and requires a fresh downloaded safety copy plus confirmation.
4. Repository takes a snapshot of current tables, then writes all imported tables in one transaction.
5. On any error the transaction aborts and the existing database is untouched. The UI reports the failure without clearing data.

## Money and dates

- Money: integer minor units. No floating-point arithmetic for totals. Parsing and formatting are centralized in `src/lib/money.ts`.
- Dates: `YYYY-MM-DD` strings. Calendar arithmetic in `src/lib/dates.ts` uses UTC internally to avoid DST shifts, but the date-only value is never converted to a timestamp for storage.
- Recurrence: `src/lib/recurrence.ts` returns date-only strings. Monthly rules clamp to month length; weekly rules use fixed 7/14-day steps.
- IDs: `crypto.randomUUID()` with a stable fallback.

## Repository API (shape)

```ts
const repos = createRepositories(db);
repos.settings.get();
repos.bills.list();
repos.bills.ensureOccurrences(from, to);
repos.bills.markPaid(occurrenceId, paymentDate);
repos.transactions.create(input);
repos.backup.exportJson();
repos.backup.restore(json);
repos.sample.seed();
repos.sample.remove();
```

All writes validate with Zod and throw `AppError` with a user-safe message and code. Multi-record operations use `db.transaction`.

## Error handling

- `ErrorBoundary` catches render errors and offers reload plus a backup link where possible.
- Repository/storage errors surface in a non-blocking banner with a retry action.
- Quota errors are detected and explained; the app does not clear data automatically.
- Form validation is inline and preserves entered values.
- 404 route is friendly and returns to Today.

## Offline

- The service worker precaches the built app shell and static assets.
- Runtime network calls are not used.
- Updates use `registerType: 'prompt'`; `UpdatePrompt` offers reload/later.
- The manifest uses relative start/scope and local icons.

## Testing strategy

- **Unit:** money parsing/formatting, date arithmetic, recurrence, plan windows, safe-to-spend, debt, savings, CSV.
- **Repository integration:** CRUD, duplicate IDs, relationship validation, bill payment atomicity, backup/restore, sample isolation, migrations.
- **UI:** quick-add validation, bill payment, settings save, onboarding.
- **E2E:** onboarding → income → bill → expense → dashboard → backup (Playwright, production preview).

## Constraints

- No backend, no user accounts or sign-in, no network dependency.
- Money accounts are planning labels created by the user, not bank connections.
- Single-user, single-browser profile.
- Data is not encrypted; the UI states this plainly.
- Backup is user-initiated; the app cannot guarantee backups exist.
