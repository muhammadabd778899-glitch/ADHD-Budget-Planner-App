# Troubleshooting

## The dashboard shows zero or missing numbers

- Confirm you completed onboarding so Harbor has a plan window and starting numbers.
- Check whether the relevant income source is active and has an end date in the future.
- Confirm transactions are cleared; pending expenses are shown separately and do not reduce cash.
- Expected income is projections, not received money; mark a payday received to turn it into a real
  transaction.

## Safe to spend is over plan (negative)

This is honest information, not an error. Harbor shows over-plan numbers with calm styling. Check:

1. Unpaid bills through the plan window end.
2. The cushion setting.
3. Pending expenses.

## Bills are not where I expect them

- Occurrences are generated from the bill rule within a rolling horizon.
- Monthly dates clamp to the last day of the month; semimonthly is fixed to the 1st and 15th.
- Editing a bill regenerates future unpaid occurrences but preserves paid and skipped history.

## Backup or restore problems

- Backups are JSON with format `tide-backup` and version 1. Only files made by Harbor 1.0 can be
  restored.
- The file must be under 15 MB and must reference valid IDs and relationships.
- Restore requires a safety copy download and one final confirmation.
- If validation fails, Harbor does not change your data.

## Offline behaviour

- Harbor requires JavaScript and IndexedDB.
- After the first load the app shell is cached; core features work offline.
- Clearing browser storage also clears the backup, so keep a recent JSON file.

## If data feels lost

1. Refresh the page.
2. Check the offline banner and storage protection state in Settings.
3. Restore from a recent JSON backup.
4. Export a CSV of transactions if you need plain numbers.

## Still stuck

Open Settings → Data or visit the Help screen inside the app. Harbor does not transmit your data, so
there is no support account to create.
