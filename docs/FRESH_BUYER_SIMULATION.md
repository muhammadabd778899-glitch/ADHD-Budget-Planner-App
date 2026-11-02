# Fresh-Buyer Simulation

A simulated first session without any imported data.

1. **Start.** Open the app in a fresh browser profile or private window.
2. **Onboarding.** Leave the name blank, set a starting balance of `500.00`, cushion of `50.00`, and
   finish onboarding.
3. **Income.** Add a biweekly paycheck of `2,000.00`, first expected payday in the current month.
4. **Bill.** Add a rent-style bill of `1,200.00`, monthly, due shortly after the payday.
5. **Spending.** Quick-add an expense of `42.00` and mark it cleared or leave it pending.
6. **Check.** Dashboard should show safe to spend equal to the documented formula and the bill
   reserved before the next payday.
7. **Backup.** Download a JSON backup and restore it once to confirm the round trip.

Expected numbers are derived from the pure functions in `src/domain`; the same checks run in unit
tests with fixed dates.
