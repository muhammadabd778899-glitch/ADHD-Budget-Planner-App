# Fresh-Buyer Simulation

A simulated first session without any imported data. Use a fresh browser profile or private window.

1. **Start.** Open the app.
2. **Onboarding.** Leave the name blank, set a starting balance of `500.00`, cushion of `50.00`, and
   finish onboarding.
3. **Income.** Add a biweekly paycheck of `2,000.00`, first expected payday in the current month.
4. **Bill.** Add a rent-style bill of `1,200.00`, monthly, due shortly after the payday.
5. **Spending.** Quick-add an expense of `42.00` and mark it cleared or leave it pending.
6. **Check.** Dashboard safe to spend equals the documented formula and the rent bill is reserved
   before the next payday.
7. **Account.** In Settings, add a cash wallet with a `80.00` opening balance. Record one expense
   against it, then switch Today between **All accounts** and the wallet. The wallet view should use
   its own opening balance and no cushion.
8. **Envelope.** In Spending, add a monthly envelope for Groceries of `300.00`. Record a cleared
   grocery expense and confirm the remaining amount falls. Confirm safe to spend does not change.
9. **Sinking fund.** In Savings, add a sinking fund with a `50.00` monthly target. Confirm a suggested
   set-aside appears, then choose **Set aside** and verify the dialog is prefilled. Confirm no money
   moved until you submit.
10. **Notes.** Add a brain-dump note and a month note. Pin the brain dump, archive the month note, then
    restore it.
11. **Backup.** Download a JSON backup and restore it once to confirm the round trip.

Expected numbers are derived from the pure functions in `src/domain`; the same checks run in unit
tests with fixed dates.
