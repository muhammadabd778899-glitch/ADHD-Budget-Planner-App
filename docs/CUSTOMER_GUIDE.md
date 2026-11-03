# Harbor — Customer Guide

Welcome to Harbor. This guide is written for real life: low-energy days, busy weeks, and moments when
you just need one clear number.

Harbor is a **local-first budget planner**. Your data stays in the browser on your device. There is no
account to create, no bank login, and no subscription. After the first load, Harbor works offline and
can be installed like an app.

---

## 1. Open Harbor for the first time

1. Open the Harbor link in a modern browser (Chrome, Edge, Safari, Firefox, or a Chromium-based
   browser on Android).
2. Harbor asks three short questions:
   - **What should Harbor call you?** Optional. It only changes the greeting.
   - **Money on hand today.** Your best estimate of spendable cash right now. It does not need to
     be perfect.
   - **Peace-of-mind cushion.** Money Harbor should leave untouched. Safe to spend stops above this
     amount.
3. Add one income source if you know your payday. You can skip it and add it later.
4. Tick **Look around with clearly labelled sample data** if you want to explore before entering
   your own numbers. Every sample record is marked **Sample** and can be removed in one step from
   **Settings → Sample data**.

That is the whole setup. You can change every answer later.

### Install it like an app (recommended)

- **Desktop Chrome or Edge:** open the browser menu and choose **Install Harbor** (or the install icon
  in the address bar).
- **Android Chrome:** menu → **Add to Home screen** → **Install**.
- **iPhone or iPad Safari:** Share → **Add to Home Screen**.

Installed or not, the same data is used in that browser profile. It does not move between browsers
or devices by itself. Use **Settings → Back up my data** to move it.

---

## 2. The one number: safe to spend

Safe to spend is the amount Harbor believes you can use before your planning window ends while still
covering the bills it knows about and leaving your cushion alone.

```
cash on hand  = starting balance
              + received income
              − cleared spending
              − savings contributions
              + savings withdrawals

safe to spend = cash on hand
              − unpaid bills through the window end
              − cushion
```

A few plain-language rules:

- **Expected paydays are not cash.** Harbor shows them separately and never adds them to safe to
  spend. Mark a payday **Received** when the money actually lands.
- **Pending expenses do not reduce cash yet.** Harbor shows a labelled caution amount so you can see
  what will happen when they clear.
- **Unpaid bills are reserved, not spent.** Marking a bill paid creates exactly one expense
  transaction and stops reserving that amount.
- **Savings transfers are not spending.** Money moved to a goal reduces spendable cash; money moved
  back restores it.
- **Debt payments are expenses.** They reduce cash once and also reduce the debt balance. They are
  never counted twice.

Tap **How this is calculated** on Today to see the same arithmetic with your own numbers.

If safe to spend is negative, that is not an error or a judgment. It means the bills and cushion you
have reserved are larger than the cash Harbor can see. The next step is usually to review due dates or
the cushion.

---

## 3. What each screen is for

| Screen           | What it does                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| **Today**        | The one number, the next useful action, upcoming bills, recent activity, and progress.             |
| **Paydays**      | Income sources, projected paydays, expected versus received income.                                |
| **Bills**        | Recurring and one-time bills, custom second due day for twice-a-month bills, paid/skipped history. |
| **Spending**     | Every expense and income record, plus monthly category limits (envelopes).                         |
| **Debt**         | Balances, recorded payments, payoff estimates, and a suggested payoff focus.                       |
| **Savings**      | Goals and sinking funds, contributions, withdrawals, progress, and a suggested set-aside.          |
| **Notes**        | Brain-dump notes and pinned month notes.                                                           |
| **Reports**      | Monthly income, spending, category breakdowns, and trends.                                         |
| **Settings**     | Appearance, currency, planning window, categories, backups, CSV exports, sample data, storage.     |
| **How it works** | The honest explanation of every rule, written in the same plain language as this guide.            |

### Today

- **Focus** hides the metric cards, recent activity, and progress summary until you turn it off.
  It changes what you see, never what is stored.
- **Right now** suggests one small next step based on your actual plan.
- The **runway** under the safe-to-spend amount shows how many days are left in the window, when the
  next payday is, and a calm daily allowance if you want one.

### Bills: list and calendar

- **List** is where you mark a bill **Paid**, **Skip** an occurrence that does not apply, or **Mark
  unpaid** if something was recorded too early.
- **Calendar** shows every occurrence in a month. Paid and skipped dates stay visible, and overdue
  unpaid bills keep a red outline. Use the arrows to look ahead or back; **This month** brings you
  home.
- A bill due on Saturday or Sunday is labelled **Weekend due date**. Harbor does not move the date or
  guess your bank's cut-off. Pay when your bank allows and mark it paid.
- For a **Twice a month** bill, the first due day is the 1st and you choose the second day (2–31). If
  that day does not exist in a shorter month, Harbor uses the month's last day.

### Accounts

Open **Settings → Accounts** to name where your money lives, such as _Main account_ or _Cash wallet_.
When you add or edit a record, you can choose its account. On **Today**, the account selector next to
safe to spend switches between **All accounts** and one account. The main account uses the starting
point and cushion from Settings; other accounts start from their own opening balance and use no
cushion. Accounts are labels only — Harbor never connects to a bank.

### Debt

The suggested payoff focus uses the **highest interest rate first** (often called the avalanche
order), with the smaller balance breaking ties. If no interest rates are entered, it uses the
**smallest balance first** (the snowball order). This is a common way to simplify decisions, not
financial advice. You can always pay a different account.

### Keyboard shortcuts

Press <kbd>?</kbd> outside a form to see the list:

| Key | Action         |
| --- | -------------- |
| N   | Add an expense |
| T   | Open Today     |
| B   | Open Bills     |
| ?   | Show shortcuts |

Shortcuts pause while you are typing in a field, so they will not interrupt a description or amount.

---

## 4. Everyday workflows

### Record a purchase

1. Press <kbd>N</kbd>, or choose **Quick add** / **Add expense**.
2. Enter the amount, a short description, and the date.
3. Use a **quick fill** chip for a common amount if it helps.
4. Leave **This payment is still pending** ticked if it has not left your account yet.
5. Save. Pending spending appears in a separate caution line until you clear it.

### Pay a bill

1. Open **Bills → List**.
2. Find the occurrence and choose **Paid**.
3. Harbor records one expense, links it to the bill, and stops reserving that amount.

If you marked it too early, choose **Mark unpaid**. Harbor asks for confirmation and removes the
linked expense.

### Skip an occurrence that does not apply

Choose **Skip** on the bill row. Skipping is reversible with **Restore**, and it is not the same as
deleting history.

### Record a payday

When money lands, open **Paydays** and choose **Received** on the projected payday. This creates an
income transaction. The projection was never counted as cash before that moment.

### Move money to savings

Open **Savings**, choose the goal, and add a contribution. Withdrawing brings cash back. Neither
counts as spending in reports.

### Set a monthly limit (envelope)

Open **Spending → Monthly category limits** and add an envelope for an expense category. Harbor shows
what is left this month based on cleared expenses. Turn on **Roll over** if unused money should carry
into next month. Envelopes are guidance: they do not hide cash or change safe to spend.

### Save for a yearly cost (sinking fund)

On **Savings**, add a goal and choose **Sinking fund** as its kind. Add a monthly amount, or a share
of the income you actually receive this month. Harbor shows a suggested set-aside. Choose **Set aside**
to open a prefilled contribution — Harbor never moves the money by itself.

### Park a thought in Notes

Open **Notes** and choose **Brain dump** for a quick thought, or **Month note** to tie it to a month.
Notes are plain text. Pin the ones you want to keep at the top, and archive the rest without deleting
them.

### Record a debt payment

Open **Debt**, choose **Payment** on the account, and record it. The balance and cash on hand both
update, and the payment appears in spending history.

### Look back at a month

Open **Reports** for totals and category trends, or **Spending** to search and filter individual
records. Charts include a text alternative for screen readers.

---

## 5. Make Harbor yours

Open **Settings → Your preferences**:

- **Appearance:** System, Light, or Dark. Harbor's default look is a calm navy and porcelain palette.
- **Currency:** 20 common currencies. Changing it relabels amounts; it does not convert them.
- **Locale and date format:** Changes how dates and amounts are displayed.
- **Planning window:** _Until next payday_ reserves bills through the day before your next projected
  payday. _This month_ uses the calendar month.
- **Categories:** Add, rename, archive, and restore categories.

Changes apply after you press **Save preferences**.

---

## 6. Backups, restore, and exports

Your data lives in this browser's **IndexedDB**. It does not sync to another device automatically.

**Make a backup when:**

- you are switching computers or browsers;
- you are about to clear browser data;
- you have just finished a big cleanup;
- you would be upset to lose the data (the honest test).

### Create a backup

**Settings → Back up my data** downloads a versioned JSON file. Keep it somewhere you will find it
again, such as a cloud drive or an external disk.

### Restore a backup

1. Open **Settings → Backup and restore**.
2. Choose the JSON file. Harbor validates the file and its relationships first.
3. Review the preview. Harbor downloads a safety copy of your current data before replacing anything.
4. Confirm once. The replace runs in a single database transaction. If it fails, your existing data
   is left unchanged.

### Spreadsheet exports

**Settings → Spreadsheet exports** creates CSV files. They are plain text: useful for spreadsheets,
but not encrypted. Harbor protects against spreadsheet formula injection, but you should still keep
the files private.

### Sample data

If you explored with sample data, remove it at any time with **Settings → Sample data → Remove all
sample data**. Your own records are untouched.

---

## 7. Offline use and updates

- After the first successful load, Harbor caches its app shell. Core features continue to work without
  a connection because everything is stored locally.
- The top bar shows when you are offline.
- When a new version is ready, Harbor asks before reloading. An open form is not discarded without
  your consent.
- Harbor does not use remote fonts, analytics, trackers, or a runtime CDN.

If the app was installed, launch it from your home screen or app list. If it was not installed, open
the same link in the same browser profile.

---

## 8. Privacy and honest limits

- Harbor sends no budget data to a server. There is no account, cloud sync, telemetry, or bank
  connection.
- Data is stored locally but **is not encrypted by Harbor**. Anyone with access to your unlocked
  browser profile may be able to read it.
- Browsers can clear site data under storage pressure. You can request persistent storage in
  Settings, but that is a request, not a guarantee. Keep backups.
- Harbor is a planning surface, not a bank, accountant, lender, tax tool, or financial adviser. It
  cannot guarantee affordability or an outcome.
- Payoff estimates assume a constant monthly payment and monthly compounding. They are rough
  guides, not promises.

---

## 9. If something looks wrong

| What you see                   | What to check                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numbers look zero or missing   | Finish onboarding; confirm the income source is active; check whether expenses are pending.                                                        |
| Safe to spend is negative      | Review unpaid bills through the window end, the cushion, and pending expenses. This is information, not a failure.                                 |
| A bill is not where you expect | Check the bill's frequency and start date. Monthly dates clamp to the last valid day.                                                              |
| A payment will not delete      | It is linked to a bill. Open **Bills** and **Mark unpaid** first.                                                                                  |
| A calendar looks empty         | Use the arrows to change month, or switch to **List** to see the next 60 days.                                                                     |
| A backup was refused           | The preview lists the reason: usually a missing linked record, duplicate ID, or hand-edited file. Nothing changes until a valid file is confirmed. |
| Data disappeared               | Check for a different browser profile or cleared site data, then restore your latest JSON backup.                                                  |

More detail is in the in-app **How it works** screen and in `docs/TROUBLESHOOTING.md`.

---

## 10. A gentle starting routine

You do not need to set everything up at once.

1. **Today:** enter money on hand and a cushion.
2. **Paydays:** add one income source.
3. **Bills:** add the two or three bills that would hurt to miss.
4. **Today:** glance at safe to spend. That is enough for week one.
5. **Settings:** download one backup and put it somewhere safe.

Add savings, debt, and the rest only when they would reduce stress rather than add it. Harbor is
designed to work with a partial picture, honestly labelled.

---

Harbor is provided for personal planning use. Support questions go through the repository issue
tracker. Please do not include financial details in a support message.
