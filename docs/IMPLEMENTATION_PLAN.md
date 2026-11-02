# Implementation Plan

## M0 — Specification and quality contract

- [x] Product spec, architecture, data model, acceptance criteria, decisions, protocol, README.
- [x] Financial definitions and edge cases written before code.
- [x] Scope and exclusions fixed.

## M1 — Foundation, visual system, shell

- [x] Vite/React/TypeScript, strict config, ESLint, Prettier.
- [x] Design tokens, base styles, primitives, icons.
- [x] Responsive shell, sidebar, mobile nav, quick-add affordance.
- [x] Routing, error boundary, 404, loading state.
- [x] CI workflow.
- [ ] Public HTTPS deployment verification (workflow included; owner must enable Pages).

## M2 — Persistence and recovery

- [x] Dexie schema, migrations, repository factory.
- [x] Zod schemas and validation errors.
- [x] Settings/categories/seed initialization.
- [x] Bill occurrence generation and payment transaction atomicity.
- [x] Backup export/validate/restore with safety copy.
- [x] Sample data isolation.
- [x] Repository tests and failure-path tests.

## M3 — Income and planning periods

- [x] Income source CRUD, pause/archive.
- [x] Recurrence projections and payday logic.
- [x] Expected vs received distinction.
- [x] Mark payday received → income transaction.
- [x] Edge-case tests.

## M4 — Bills

- [x] Bill CRUD and archive.
- [x] Occurrence horizon, statuses, overdue.
- [x] Mark paid/unpaid/skip with confirmations.
- [x] Recurrence edit semantics.
- [x] Tests across month/leap/year boundaries.

## M5 — Spending, dashboard, safe to spend

- [x] Quick add, edit, delete, undo.
- [x] Search and filters.
- [x] Dashboard, plan window, breakdowns, explanations.
- [x] Pending handling.
- [x] Calculation and UI tests.

## M6 — Debt and savings

- [x] Debt CRUD, payments, history, estimate.
- [x] Savings goal CRUD, entries, progress.
- [x] Reconciliation tests.

## M7 — UX and accessibility refinement

- [x] All screen states, keyboard flow, dialog behaviour, focus.
- [x] Reduced motion, contrast, touch targets.
- [x] Copy and hierarchy review.

## M8 — Offline and portability

- [x] PWA manifest/service worker/update prompt.
- [x] Offline CRUD verification in production build.
- [x] CSV export safeguards.
- [x] Clean-profile tests and evidence.

## M9 — Release

- [x] Full verify pipeline.
- [x] Financial audit, regression checklist, fresh-buyer simulation.
- [x] Customer docs and Etsy copy.
- [ ] Publish listing (owner action).

## Verification commands

```bash
npm ci
npm run verify        # format:check, typecheck, lint, test, build
npm run test:e2e      # Playwright critical flows (after install)
npm run preview       # production artifact
```
