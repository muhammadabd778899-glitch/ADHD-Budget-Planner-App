# AI Development Protocol

This file is permanent project guidance. Read it before every milestone.

## Required workflow

1. Read this protocol and the relevant approved documents in `docs/`.
2. Inspect the repository, Git status, package scripts, source, and tests before changing anything.
3. Confirm the previous milestone is complete and verified.
4. Implement only the current milestone.
5. Ask before changing financial rules, the data model, architecture, scope, or customer-facing claims.
6. Keep domain logic pure. Keep persistence behind typed repositories.
7. Validate all untrusted input at boundaries.
8. Preserve existing customer data and backward compatibility.
9. Add tests for new behaviour and failure paths.
10. Run the verification pipeline and inspect regressions.
11. Update documentation and the milestone report.
12. Stop for owner approval before proceeding.

## Non-negotiables

- Never disable tests, weaken assertions, suppress errors, or replace real behaviour with stubs to make a check pass.
- Never silently reset, overwrite, or discard customer data.
- Never implement a dead control or placeholder chart presented as working.
- Never claim offline reliability, encryption, automatic backups, bank sync, guaranteed outcomes, or cross-device sync unless implemented and verified.
- All financial totals must be derived from source records by pure functions.
- UI components must not import `db` or Dexie.
- Money is integer minor units. Dates are `YYYY-MM-DD`.
- Destructive actions require confirmation and should offer recovery where practical.

## Verification pipeline

`npm run verify` runs, sequentially:

1. `npm run format:check`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test`
5. `npm run build`

Once Playwright is in use, `npm run test:e2e` is part of milestone verification.

## Milestone report template

Every milestone ends with:

- Completed functionality
- Important files changed
- Verification commands and actual results
- Acceptance criteria passed / not passed
- Manual checks performed
- Known limitations and risks
- Decisions or owner questions
- Recommended Git checkpoint
- Next milestone

Reports live in `docs/MILESTONES.md`.

## Quality gate

A milestone is not complete because code exists. It is complete when the acceptance criteria are demonstrated, the verification pipeline passes, documentation matches the app, and known limitations are stated honestly.
