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
- Monthly dates clamp to the last day of the month.
- Semimonthly bills use the 1st and the **second due day** you chose (default 15). If that day does
  not exist in a shorter month, Harbor uses the month's last day.
- Editing a bill regenerates future unpaid occurrences but preserves paid and skipped history.

## A record is missing from one account

- Records with no account belong to the **main account**.
- The account selector on Today filters the dashboard, not your stored records. Switch back to **All
  accounts** to see everything.
- Archived accounts are hidden from pickers; their existing records remain.

## My envelope shows a different amount than I expected

- Envelopes count **cleared** expenses in that category for the current month. Pending expenses do not
  count until they clear.
- With rollover on, unused money from earlier months carries forward.
- Envelopes are guidance only. They do not reserve cash and do not change safe to spend.

## The sinking-fund suggestion is zero

- The goal may already have received its suggested amount this month.
- The monthly target may be zero and no income share may be set.
- A suggestion is optional. You can still add any contribution you choose.

## A note is not visible

- Archived notes are hidden from the main list. Open the archived section and choose **Restore**.
- Month notes are grouped by their month; use the filter to find them.

## Backup or restore problems

- Backups are JSON with format `tide-backup` and version 1. Files from earlier Harbor versions remain
  restorable; missing newer fields receive defaults and a main account is created if needed.
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
