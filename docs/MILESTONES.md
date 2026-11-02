# Milestones

| Milestone | Scope                                                               | Status      |
| --------- | ------------------------------------------------------------------- | ----------- |
| M0        | Product spec, architecture, data model, acceptance, decisions, plan | Complete    |
| M1        | Foundation, visual system, shell, routing, design tokens            | Complete    |
| M2        | Persistence, migration, repositories, validation, backups           | Complete    |
| M3        | Income, planning windows, paydays, expected vs received             | Complete    |
| M4        | Bills, occurrences, statuses, payment linkage                       | Complete    |
| M5        | Spending, dashboard, safe-to-spend formula                          | Complete    |
| M6        | Debt, savings, reports                                              | Complete    |
| M7        | ADHD-friendly UX, accessibility, calm copy, reduced motion          | Complete    |
| M8        | Offline, PWA, backup, portability                                   | Complete    |
| M9        | Release, docs, verification, deployment                             | In progress |

## Milestone notes

- **M0–M1:** The application scaffold, design system, shell, routing, and documentation of the
  financial contract are implemented and unit tested.
- **M2:** Dexie schema v1/v2, typed repositories, atomic bill payment, validated backups, and
  sample-data isolation are implemented and covered by repository tests.
- **M3–M6:** Income, bill, spending, debt, savings, and report calculations are implemented in the
  pure domain layer and covered by domain tests.
- **M7:** Screens use calm copy, single primary actions, disclosure for formulas, and accessible
  states; visual tokens cover light/dark and reduced motion.
- **M8:** PWA service worker, prompts, backup, CSV, and storage handling are implemented. The
  production artifact still needs an owner-performed offline smoke pass on a clean profile.
- **M9:** `npm run verify` passes, release documentation exists, and GitHub Pages deployment is
  wired through CI. Publishing the public listing remains an owner action.

## Verification evidence

- Unit and domain tests: `src/**/*.test.ts` under Vitest.
- Repository integration tests use fake-indexeddb against real Dexie transactions.
- UI smoke: `src/App.test.tsx`.
- End-to-end: `e2e/smoke.spec.ts` with Playwright.
- Pipeline: `npm run verify` and `npm run test:e2e`.

The public HTTPS deployment check requires GitHub Pages to be enabled by the repository owner. The
deployment workflow expects the final Pages base path `/ADHD-Budget-Planner-App/`.
