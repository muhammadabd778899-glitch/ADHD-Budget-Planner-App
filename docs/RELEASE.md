# Release Notes and Owner Handoff

Current build: **1.0.0 — November 2026 feature update**

This document is for the seller/owner. The buyer-facing document is `docs/CUSTOMER_GUIDE.md`; the
public listing copy is `docs/ETSY_COPY.md`.

---

## What this release adds

- **Accounts** for checking, savings, cash, and credit balances, with safe to spend viewable for all
  accounts or one account at a time.
- **Semimonthly bill timing** with the 1st plus a user-chosen second due day (2–31, default 15).
- **Monthly category envelopes** with optional rollover.
- **Sinking funds** with a monthly target or income-share suggestion. Harbor suggests; it never moves
  money automatically.
- **Brain dump and month notes** stored locally.
- **Database schema v3** with additive migration. Existing data and older backups continue to work.

---

## Verified release status

| Check                | Status                                                            |
| -------------------- | ----------------------------------------------------------------- |
| `npm run verify`     | Passed — format, typecheck, lint, 83 unit tests, production build |
| `npm run test:e2e`   | Passed — 1 Playwright smoke test                                  |
| Production build     | PWA generated with app-shell service worker                       |
| GitHub Pages         | Live and returning HTTP 200                                       |
| CI workflow          | Passing on `main`                                                 |
| Deployment workflow  | Passing on `main`                                                 |
| Backup compatibility | Format `tide-backup` v1; schema v3 restore tested                 |

Live URL: `https://muhammadabd778899-glitch.github.io/ADHD-Budget-Planner-App/`

Pushes to `main` automatically run CI and deploy to GitHub Pages.

---

## Approved safe-to-spend formula

```
cashOnHand    = startingBalance
              + receivedIncome (date <= today, status = cleared)
              − actualSpending (date <= today, status = cleared)
              − savingsContributions (date <= today)
              + savingsWithdrawals (date <= today)

reservedBills = unpaid, non-skipped bill occurrences due through the plan window end

safeToSpend   = cashOnHand − reservedBills − cushion
```

- **All accounts** uses the formula above across every record.
- **One account** uses only that account's records. Records with no account belong to the main
  account.
- The **main account** uses the starting balance and cushion from Settings.
- A **secondary account** uses its own opening balance and a cushion of zero, because the cushion is a
  plan-wide reserve.
- Expected income is reported separately and never enters safe to spend.
- Pending expenses are excluded from cash and surfaced as a labelled caution.
- Savings contributions reduce cash; withdrawals restore cash; neither is spending.
- Debt payments are expense transactions linked to the debt.
- A bill marked paid creates exactly one linked expense; marking it unpaid removes that expense after
  confirmation.

---

## Edge cases covered

- Money is stored as integer minor units; no floating-point financial totals.
- Negative cash on hand and negative safe to spend display calmly.
- Zero cushion, zero starting balance, zero payments, and zero savings goals.
- Overpayment shows a negative debt balance and is labelled.
- Monthly and semimonthly dates clamp to the last valid day; leap years use calendar arithmetic.
- Semimonthly bills use the 1st plus the chosen second day. Income semimonthly projections remain the
  1st and 15th.
- Pending and future-dated transactions are handled distinctly.
- Envelopes use cleared expenses only and never reserve cash.
- Sinking-fund suggestions can be `$0` and never create a transaction on their own.
- Schema v3 migration creates `acct-main`, backfills account and new-field defaults, and preserves
  existing records.
- Older backups restore through additive defaults and a recreated main account when needed.

---

## What to upload to the Etsy listing

1. **`docs/ETSY_COPY.md`** — copy the title, description, FAQ, and tags into the listing editor.
2. **`docs/CUSTOMER_GUIDE.md`** — convert to PDF or attach as the buyer guide. It covers setup,
   screens, accounts, envelopes, sinking funds, notes, backups, offline use, privacy, and
   troubleshooting.
3. **The app ZIP** — keep the hosted app link inside the purchased download, not in the public
   listing.
4. **Optional screenshots** — Today, Bills calendar, Spending envelopes, Savings sinking fund, and
   Notes. Use real data or clearly labelled sample data.

## What to keep internal

- `docs/PRODUCT_SPEC.md`
- `docs/DATA_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/ACCEPTANCE_CRITERIA.md`
- `docs/MILESTONES.md`
- `docs/RELEASE.md` (this file)
- `docs/TROUBLESHOOTING.md`

These are safe to publish, but they are written for maintenance rather than for buyers.

---

## Release checklist

- [x] Financial calculation audit documented.
- [x] Regression checklist in `docs/ACCEPTANCE_CRITERIA.md`.
- [x] Fresh-buyer simulation steps in `docs/FRESH_BUYER_SIMULATION.md`.
- [x] Full verification pipeline passes.
- [x] Version `1.0.0` recorded in `package.json` and the About panel.
- [x] Backup format version `1`; database schema version `3`.
- [x] Production build contains PWA manifest, icons, service worker, and app shell.
- [x] GitHub Pages deployment verified; CI and deploy workflows pass.
- [x] Listing copy updated for accounts, envelopes, sinking funds, notes, and custom bill timing.
- [x] Customer guide updated for the same features.
- [ ] Owner: publish the listing copy.
- [ ] Owner: attach the final guide and ZIP to the listing.
- [ ] Owner: complete a clean-profile offline acceptance pass.
- [ ] Owner: record final package contents and checksums.

---

## Known limitations at release

- No bank sync, AI advice, cloud sync, subscriptions, or investment features.
- No encryption; data is local to the browser only.
- No automatic multi-device sync. Use JSON backup/restore to move data.
- No automatic money movement: envelopes and sinking-fund suggestions are guidance only.
- Accounts are planning labels, not bank connections or multi-user households.
- The public listing and final delivery package remain owner actions.
