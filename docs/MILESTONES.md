# Milestones

| Milestone | Scope                                                                   | Status   |
| --------- | ----------------------------------------------------------------------- | -------- |
| M0        | Product spec, architecture, data model, acceptance, decisions, plan     | Complete |
| M1        | Foundation, visual system, shell, routing, design tokens                | Complete |
| M2        | Persistence, migration, repositories, validation, backups               | Complete |
| M3        | Income, planning windows, paydays, expected vs received                 | Complete |
| M4        | Bills, occurrences, statuses, payment linkage                           | Complete |
| M5        | Spending, dashboard, safe-to-spend formula                              | Complete |
| M6        | Debt, savings, reports                                                  | Complete |
| M7        | ADHD-friendly UX, accessibility, calm copy, reduced motion              | Complete |
| M8        | Offline, PWA, backup, portability                                       | Complete |
| M9        | Release, docs, verification, deployment                                 | Complete |
| M10       | Premium navy redesign, ease-of-use upgrades, customer docs              | Complete |
| M11       | Accounts, envelopes, sinking funds, notes, semimonthly bills, schema v3 | Complete |

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
  live through CI.
- **M10:** The visual system moved to a navy "Midnight Harbor" palette with a premium shell, serif
  display type, gold accents, and a finance-close chart mark. The product is named Harbor throughout
  the app, manifest, icons, and documents. Bills gained a calendar and weekend labels, Debt gained a
  payoff focus, and Today gained Focus mode, Right Now, and a runway. Quick-fill amounts, keyboard
  shortcuts, centred dialogs, premium motion with reduced-motion fallbacks, and expanded customer
  and listing copy complete the ease-of-use pass. Deployment configuration was left untouched.
- **M11:** The household upgrade adds named accounts with account-scoped safe to spend, semimonthly
  bills with a custom second due day, monthly category envelopes, sinking funds with suggested
  set-asides, and brain-dump/month notes. Schema v3 migrates existing data additively, and older
  backups restore with defaults. Verification covers domain functions, repository transactions,
  migration, backup round trips, and the production build.

## Verification evidence

- Unit and domain tests: `src/**/*.test.ts` under Vitest.
- Repository integration tests use fake-indexeddb against real Dexie transactions.
- UI smoke: `src/App.test.tsx`.
- End-to-end: `e2e/smoke.spec.ts` with Playwright.
- Pipeline: `npm run verify` and `npm run test:e2e`.
- Visual QA: desktop (1440 px) and mobile (390 px) in light and dark themes, with sample data.

The public HTTPS deployment is live at the GitHub Pages base path
`/ADHD-Budget-Planner-App/`; the deployment workflow was not modified by M10.
