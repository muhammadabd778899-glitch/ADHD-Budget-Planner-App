# Decision Log

Status values: **Approved** (implemented), **Deferred**, **Rejected**.

| ID    | Decision                                                                                                           | Status        | Rationale                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------------- | --------------------------------------------------------------------- |
| D-001 | Local-first browser app; no server, accounts, bank linking, or sync                                                | Approved      | Privacy, offline reliability, Etsy-friendly delivery, no backend cost |
| D-002 | React + TypeScript + Vite, Dexie + Zod, pure domain layer                                                          | Approved      | Matches quality benchmark; strong typing and testability              |
| D-003 | Money stored as integer minor units                                                                                | Approved      | Avoids floating-point drift; required for trustworthy totals          |
| D-004 | Dates stored as date-only `YYYY-MM-DD`; UTC used only for calendar arithmetic                                      | Approved      | Prevents timezone shifts on bills/paydays                             |
| D-005 | Safe to spend excludes expected income                                                                             | Approved      | Conservative; prevents future money masking current risk              |
| D-006 | Safe to spend = cash on hand − unpaid bills through period end − cushion                                           | Approved      | Simple, explainable, auditable; cushion covers reserved savings       |
| D-007 | Savings goals do not auto-reserve money; recorded contributions move cash; cushion is the reserved-savings control | Approved      | Avoids double-counting and surprising deductions                      |
| D-008 | Planning window defaults to “until next payday”; month option available                                            | Approved      | Paycheck-to-paycheck is the core use case                             |
| D-009 | Received income is a transaction, not a separate paycheck record                                                   | Approved      | One canonical source prevents double counting                         |
| D-010 | Only cleared transactions affect cash on hand; pending shown separately                                            | Approved      | Honest about uncertainty                                              |
| D-011 | Bills are materialised as occurrences with deterministic IDs                                                       | Approved      | History/status can be preserved while dates stay computed             |
| D-012 | Bill payment creates exactly one linked expense transaction                                                        | Approved      | Reconciles spending and reservations without double counting          |
| D-013 | Editing a bill preserves paid/skipped history and rewrites future unpaid occurrences                               | Approved      | Historical accuracy + understandable future changes                   |
| D-014 | Deleting a paid bill’s transaction is blocked until marked unpaid                                                  | Approved      | Protects the bill–payment relationship                                |
| D-015 | Debt payments are expense transactions linked to the debt                                                          | Approved      | Single cash record; payment history and balance reconcile             |
| D-016 | Debt payoff estimate is optional, assumption-labelled, not advice                                                  | Approved      | Scope and trust boundary                                              |
| D-017 | Semimonthly = 1st and 15th for v1                                                                                  | Approved      | Simple, predictable; covers common payroll                            |
| D-018 | No automatic interest posting or amortisation ledger                                                               | Approved      | Avoids false precision; user records actual payments                  |
| D-019 | Currency can change; stored minor units are not converted                                                          | Approved      | Prevents silent value corruption; UI warns clearly                    |
| D-020 | Backups are user-initiated, not automatic                                                                          | Approved      | Browser limits; no false “automatic backup” claim                     |
| D-021 | Restore requires safety download + explicit confirmation; atomic transaction                                       | Approved      | Data safety                                                           |
| D-022 | Sample data uses `sample: true` and `sample-` IDs; removal scoped to those                                         | Approved      | Protects real records                                                 |
| D-023 | HashRouter for static-host reliability                                                                             | Approved      | Deep links survive GitHub Pages/offline without server rewrites       |
| D-024 | PWA update prompt, never forced reload                                                                             | Approved      | Avoids losing unsaved work                                            |
| D-025 | No encryption claim; local-only storage stated plainly                                                             | Approved      | Accuracy                                                              |
| D-026 | Bank sync, AI advice, subscriptions, investments, credit scores, multi-user                                        | Rejected (v1) | Not required; adds risk and unsupported claims                        |
| D-027 | Use system fonts; no remote font/CDN                                                                               | Approved      | Offline and privacy                                                   |
| D-028 | Currency defaults to USD; locale/date format configurable                                                          | Approved      | Broad default; user can adjust                                        |
| D-029 | “Today” is the browser’s local date at load time                                                                   | Approved      | Matches user expectation; date-only values unaffected                 |
| D-030 | Monthly recurrence clamps to last day of month                                                                     | Approved      | Handles 29/30/31 and leap years predictably                           |

## Open owner questions (non-blocking for v1)

1. Whether to add a dedicated “planned one-off expenses” feature in v2.
2. Whether to support two custom semimonthly days instead of fixed 1st/15th.
3. Whether to host the public demo on GitHub Pages or a custom domain.
4. Whether to add an optional passcode lock (would require an honest security claim).

None of these changes the v1 data model or core formula.
