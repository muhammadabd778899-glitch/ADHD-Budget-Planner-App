# Acceptance Criteria

Each item is testable. Milestone status is recorded in `docs/MILESTONES.md`.

## Foundation (M1)

- [x] React + TypeScript + Vite project builds with strict TypeScript.
- [x] Responsive shell with desktop sidebar, mobile bottom navigation, and skip link.
- [x] Design tokens for colour, type, spacing, radii, shadows, and focus.
- [x] Light/dark/system appearance with `prefers-color-scheme` fallback.
- [x] Error boundary, 404 route, and accessible not-found action.
- [x] Reusable primitives: Button, Card, Field, Input, Select, Dialog, EmptyState, ProgressBar, Badge, Toast.
- [x] No placeholder controls presented as working features.
- [x] CI workflow runs format, typecheck, lint, test, and build.

## Data foundation (M2)

- [x] Versioned Dexie schema with typed tables.
- [x] Zod validation on all repository writes and backup imports.
- [x] Typed repositories; UI never imports Dexie.
- [x] Atomic bill payment and restore.
- [x] Schema migration harness and test.
- [x] Backup includes every table and validates IDs/relationships.
- [x] Restore preview, explicit confirmation, and downloaded safety copy.
- [x] Failed restore leaves data unchanged.
- [x] Quota/storage errors surfaced without clearing data.
- [x] Sample data seeded only on request and removable without touching real data.

## Income (M3)

- [x] Create/edit/pause/archive income sources.
- [x] Weekly, biweekly, semimonthly (1st & 15th), monthly, one-time, and irregular frequencies.
- [x] Upcoming paydays accurate across month ends and leap years.
- [x] Expected income visually distinct from received income.
- [x] Marking a projected payday received creates an income transaction.
- [x] No projection for inactive, ended, past one-time, or irregular sources.
- [x] Empty, loading, error, and validation states.

## Bills (M4)

- [x] Create/edit/archive recurring and one-time bills.
- [x] Occurrences generated lazily and deterministically.
- [x] Monthly clamping, leap year, quarterly, yearly, and weekly recurrence tests.
- [x] Paid, skipped, unpaid, and derived overdue states.
- [x] Mark paid creates exactly one linked expense transaction.
- [x] Mark unpaid removes the linked transaction after confirmation.
- [x] Editing a bill preserves paid/skipped history and regenerates future unpaid occurrences.
- [x] Archived bills stop reserving future money.
- [x] Upcoming bills prioritised with calm empty states.

## Spending and dashboard (M5)

- [x] Quick-add expense/income in a modal from every screen.
- [x] Edit/delete with undo and confirmation where required.
- [x] Search by description/notes and filter by type/category/status.
- [x] Safe-to-spend uses the approved formula only.
- [x] Every dashboard total is derived from source records through a pure function.
- [x] Expected income, received income, reserved bills, actual spending, and pending amounts are distinct.
- [x] No double counting between bill payments and transactions.
- [x] "How this is calculated" explanations accessible to keyboard/screen readers.
- [x] Rounding, zero, negative, missing, duplicate, and boundary tests.

## Debt and savings (M6)

- [x] Add/edit/archive debt accounts; record payments with history.
- [x] Derived balance reconciles with payments; pending payments labelled.
- [x] Payoff estimate labelled as an estimate with assumptions.
- [x] Add/edit/archive savings goals; contribute/withdraw; progress and remaining.
- [x] Savings entries do not count as spending.
- [x] History preserved when editing goals/debts.

## ADHD UX and accessibility (M7)

- [x] One obvious next action per screen.
- [x] Progressive disclosure for formulas and advanced fields.
- [x] Calm language; no shame-based or alarmist copy.
- [x] Complete empty/loading/error/no-results/success states.
- [x] Keyboard navigation and visible focus across core workflows.
- [x] Native dialogs, labelled fields, accessible errors, live status announcements.
- [x] Status conveyed by icon + text, not colour alone.
- [x] Reduced-motion support; 44px touch targets; 320px layout.
- [x] Charts have text alternatives.

## Offline and portability (M8)

- [x] Installable PWA; app shell cached; no runtime CDN/remote fonts/analytics.
- [x] Offline CRUD with IndexedDB.
- [x] User-consented update prompt that does not discard unsaved work.
- [x] Validated versioned JSON backup/restore.
- [x] CSV export with formula-injection protection and sensitive-data warning.
- [x] Sample data is optional, labelled, isolated, removable.
- [ ] Production artifact tested in a clean profile (see M8 report).

## Release (M9)

- [x] Full verification pipeline passes.
- [x] Financial calculation audit documented.
- [x] Fresh-buyer simulation documented.
- [x] Quick-start, offline, backup, feature, troubleshooting, license/support docs.
- [ ] Etsy copy avoids unsupported claims.
- [ ] Version, checksums, and package contents recorded.

## Post-release owner actions

- [ ] Enable GitHub Pages for the repository.
- [ ] Publish the public listing copy.
- [ ] Complete the clean-profile offline acceptance pass.
- [ ] Record final release checksums and package contents.
