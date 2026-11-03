import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Badge, Disclosure, EmptyState, InlineNotice, ProgressBar } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { BillOccurrenceRow, TransactionRow } from '@/components/finance/rows';
import { useAppData } from '@/state/AppDataProvider';
import { calculateSafeToSpend } from '@/domain/safeToSpend';
import { accountSafeToSpendInput, belongsToAccount } from '@/domain/accounts';
import { debtSummary, totalDebtMinor } from '@/domain/debt';
import { savingsSummary, totalSavingsMinor } from '@/domain/savings';
import { addDays, daysBetween, formatDateOnly, relativeDayLabel, todayISO } from '@/lib/dates';
import { formatMoney, formatMoneyShort } from '@/lib/money';
import { sortOccurrencesForDisplay } from '@/domain/reports';
import type { BillOccurrence } from '@/domain/types';

function greeting(name: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name.split(' ')[0]}` : part;
}

export function DashboardPage() {
  const { snapshot, actions, busy, openQuickAdd } = useAppData();
  const [focusMode, setFocusMode] = useState(() => {
    try {
      return localStorage.getItem('tide-focus-mode') === '1';
    } catch {
      return false;
    }
  });
  const [accountId, setAccountId] = useState('all');
  const today = todayISO();
  const categoryMap = useMemo(
    () => new Map((snapshot?.categories ?? []).map((category) => [category.id, category])),
    [snapshot?.categories],
  );
  const upcoming = useMemo(() => {
    const horizon = addDays(today, 30);
    return sortOccurrencesForDisplay(
      (snapshot?.billOccurrences ?? []).filter(
        (occurrence) =>
          occurrence.status === 'unpaid' &&
          (occurrence.dueDate < today || occurrence.dueDate <= horizon),
      ),
    ).slice(0, 5);
  }, [snapshot?.billOccurrences, today]);

  if (!snapshot) return null;
  const { settings, bills, billOccurrences, transactions, debts, savingsGoals, savingsEntries } =
    snapshot;
  const currency = settings.currency;
  const locale = settings.locale;
  const accounts = snapshot.accounts;
  const selectedAccountId = accounts.some((account) => account.id === accountId)
    ? accountId
    : 'all';
  const selectedAccount =
    selectedAccountId === 'all'
      ? null
      : (accounts.find((account) => account.id === selectedAccountId) ?? null);
  const scopedBills =
    selectedAccountId === 'all'
      ? bills
      : bills.filter((bill) => belongsToAccount(bill.accountId, selectedAccountId));
  const scopedBillIds = new Set(scopedBills.map((bill) => bill.id));
  const scopedOccurrences =
    selectedAccountId === 'all'
      ? billOccurrences
      : billOccurrences.filter((occurrence) => scopedBillIds.has(occurrence.billId));
  const scopedTransactions =
    selectedAccountId === 'all'
      ? transactions
      : transactions.filter((transaction) =>
          belongsToAccount(transaction.accountId, selectedAccountId),
        );
  const scopedUpcoming =
    selectedAccountId === 'all'
      ? upcoming
      : upcoming.filter((occurrence) => scopedBillIds.has(occurrence.billId));
  const breakdown = calculateSafeToSpend(
    selectedAccountId === 'all'
      ? {
          settings,
          transactions,
          savingsEntries,
          billOccurrences,
          bills,
          incomeSources: snapshot.incomeSources,
          today,
        }
      : accountSafeToSpendInput(snapshot, selectedAccountId, today),
  );

  const nextOccurrence = scopedUpcoming[0];
  const overdueCount = scopedOccurrences.filter(
    (occurrence) => occurrence.status === 'unpaid' && occurrence.dueDate < today,
  ).length;
  const activeDebts = debts.filter((debt) => !debt.archived);
  const activeGoals = savingsGoals.filter((goal) => !goal.archived);
  const debtTotal = totalDebtMinor(activeDebts, transactions);
  const savingsTotal = totalSavingsMinor(activeGoals, savingsEntries);
  const nextBillDays = nextOccurrence ? daysBetween(today, nextOccurrence.dueDate) : null;
  const hasSchedule = snapshot.incomeSources.some((source) => source.active);
  const hasData =
    transactions.length > 0 ||
    bills.length > 0 ||
    snapshot.incomeSources.length > 0 ||
    debts.length > 0 ||
    savingsGoals.length > 0 ||
    savingsEntries.length > 0;

  const daysToPayday = breakdown.nextPayday ? daysBetween(today, breakdown.nextPayday) : null;
  const daysLeftInWindow = Math.max(1, daysBetween(today, breakdown.planWindow.end) + 1);
  const windowDays = Math.max(
    1,
    daysBetween(breakdown.planWindow.start, breakdown.planWindow.end) + 1,
  );
  const dailyAllowanceMinor =
    breakdown.safeToSpendMinor > 0 ? Math.round(breakdown.safeToSpendMinor / daysLeftInWindow) : 0;
  const runwayProgress = Math.min(
    100,
    Math.max(0, ((windowDays - daysLeftInWindow) / windowDays) * 100),
  );

  function toggleFocusMode() {
    setFocusMode((current) => {
      const next = !current;
      try {
        localStorage.setItem('tide-focus-mode', next ? '1' : '0');
      } catch {
        // A blocked storage API must not stop the view from changing.
      }
      return next;
    });
  }

  const nextAction = (() => {
    if (!hasSchedule) {
      return {
        title: 'Add your pay schedule',
        body: 'Harbor uses your next payday to decide how far ahead to reserve bills.',
        to: '/income',
        label: 'Add income',
        icon: 'calendar' as const,
      };
    }
    if (!bills.some((bill) => bill.active)) {
      return {
        title: 'Add your first bill',
        body: 'Recurring bills become calm, visible commitments instead of surprises.',
        to: '/bills',
        label: 'Add a bill',
        icon: 'receipt' as const,
      };
    }
    if (overdueCount > 0) {
      return {
        title: `${overdueCount} ${overdueCount === 1 ? 'bill is' : 'bills are'} past due`,
        body: 'No judgment. Clear what you can, or skip an occurrence that does not apply.',
        to: '/bills',
        label: 'Review bills',
        icon: 'alert-circle' as const,
      };
    }
    if (breakdown.safeToSpendMinor < 0) {
      return {
        title: 'Your plan is tight right now',
        body: 'The bills you have reserved are larger than your available cash and cushion. Reviewing due dates is a good next step.',
        to: '/bills',
        label: 'Look at upcoming bills',
        icon: 'receipt' as const,
      };
    }
    if (nextBillDays !== null && nextBillDays <= 7) {
      return {
        title: nextBillDays === 0 ? 'A bill is due today' : 'A bill is coming up',
        body: 'Mark it paid when it leaves your account. Harbor records one expense and updates your plan.',
        to: '/bills',
        label: 'Open bills',
        icon: 'calendar-check' as const,
      };
    }
    return {
      title: 'You are set for now',
      body: 'Log spending as it happens. One small entry is enough to keep the picture honest.',
      to: '/spending',
      label: 'See spending',
      icon: 'check-circle' as const,
    };
  })();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={greeting(settings.displayName)}
        title="Today"
        description={
          hasData
            ? 'One calm number, and the few things that matter next.'
            : 'Start small. Harbor gets more useful with each piece you add.'
        }
        actions={
          <>
            <button
              type="button"
              className="button button--ghost button--sm focus-toggle"
              aria-pressed={focusMode}
              aria-label={focusMode ? 'Turn off focus mode' : 'Turn on focus mode'}
              onClick={toggleFocusMode}
            >
              <span className="focus-toggle__switch" aria-hidden="true" />
              <span>Focus</span>
            </button>
            <Button icon="plus" onClick={() => openQuickAdd({ type: 'expense', date: today })}>
              Add expense
            </Button>
            <ButtonLink to="/bills" variant="secondary" icon="receipt">
              Bills
            </ButtonLink>
          </>
        }
      />

      {settings.sampleDataLoaded ? (
        <InlineNotice tone="info" title="Sample data is on">
          These records are examples, clearly marked, and never mixed into your own data when you
          remove them. <Link to="/settings">Remove sample data in Settings</Link>.
        </InlineNotice>
      ) : null}

      <section className={`safe-card ${breakdown.safeToSpendMinor < 0 ? 'safe-card--tight' : ''}`}>
        <div className="safe-card__main">
          <div className="safe-card__topline">
            <p className="eyebrow">Safe to spend</p>
            {accounts.length > 1 ? (
              <label className="safe-account">
                <span className="sr-only">Account</span>
                <Select
                  value={selectedAccountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  aria-label="Account for safe to spend"
                >
                  <option value="all">All accounts</option>
                  {accounts
                    .filter(
                      (account) =>
                        !account.archived ||
                        account.id === selectedAccountId ||
                        account.id === accountId,
                    )
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </Select>
              </label>
            ) : null}
            <Badge tone="neutral" icon="calendar">
              {breakdown.planWindow.label}
              {breakdown.planWindow.mode === 'paycheck' && breakdown.planWindow.nextPayday
                ? ` · through ${formatDateOnly(addDays(breakdown.planWindow.nextPayday, -1), locale, 'short')}`
                : breakdown.planWindow.mode === 'month'
                  ? ` · through ${formatDateOnly(breakdown.planWindow.end, locale, 'short')}`
                  : ''}
            </Badge>
          </div>
          <p className="safe-card__amount">
            {breakdown.safeToSpendMinor < 0 ? 'Over plan by ' : ''}
            {formatMoney(Math.abs(breakdown.safeToSpendMinor), currency, locale)}
          </p>
          <p className="safe-card__formula">
            {formatMoney(breakdown.cashOnHandMinor, currency, locale)} available −{' '}
            {formatMoney(breakdown.reservedBillsMinor, currency, locale)} reserved bills −{' '}
            {formatMoney(breakdown.cushionMinor, currency, locale)} cushion
          </p>
          <div className="safe-card__runway">
            <div className="runway__labels">
              <span>
                <strong>{daysLeftInWindow}</strong> {daysLeftInWindow === 1 ? 'day' : 'days'} left
                in this window
                {daysToPayday !== null && breakdown.planWindow.mode === 'paycheck'
                  ? ` · payday in ${daysToPayday} ${daysToPayday === 1 ? 'day' : 'days'}`
                  : ''}
              </span>
              <span>
                {dailyAllowanceMinor > 0 ? (
                  <>
                    about <strong>{formatMoney(dailyAllowanceMinor, currency, locale)}</strong> /
                    day
                  </>
                ) : (
                  'No daily allowance left'
                )}
              </span>
            </div>
            <div className="runway__track" aria-hidden="true">
              <div className="runway__fill" style={{ width: `${runwayProgress}%` }} />
            </div>
          </div>
          <div className="safe-card__actions">
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => openQuickAdd({ type: 'expense', date: today })}
            >
              Add expense
            </Button>
            <ButtonLink to="/income" variant="ghost" icon="calendar">
              Paydays
            </ButtonLink>
          </div>
        </div>
        <div className="safe-card__aside">
          <div className="safe-card__aside-item">
            <span>Available now{selectedAccount ? ` · ${selectedAccount.name}` : ''}</span>
            <strong>{formatMoney(breakdown.cashOnHandMinor, currency, locale)}</strong>
          </div>
          <div className="safe-card__aside-item">
            <span>Reserved for {breakdown.reservedBillCount} bills</span>
            <strong>{formatMoney(breakdown.reservedBillsMinor, currency, locale)}</strong>
          </div>
          <div className="safe-card__aside-item">
            <span>Cushion</span>
            <strong>{formatMoney(breakdown.cushionMinor, currency, locale)}</strong>
          </div>
        </div>
      </section>

      <section className="right-now" aria-labelledby="right-now-title">
        <span className="right-now__icon" aria-hidden="true">
          <Icon name={nextAction.icon} size={20} />
        </span>
        <div className="right-now__text">
          <p className="right-now__eyebrow">Right now</p>
          <h2 className="right-now__title" id="right-now-title">
            {nextAction.title}
          </h2>
          <p className="right-now__body">{nextAction.body}</p>
        </div>
        <div className="right-now__actions">
          <ButtonLink to={nextAction.to} icon={nextAction.icon} size="md">
            {nextAction.label}
          </ButtonLink>
        </div>
      </section>

      {breakdown.pendingExpensesMinor > 0 ? (
        <InlineNotice tone="warning" title="Pending expenses are not counted yet">
          There is {formatMoney(breakdown.pendingExpensesMinor, currency, locale)} in pending
          spending. If it clears, safe to spend would be about{' '}
          <strong>{formatMoney(breakdown.safeAfterPendingMinor, currency, locale)}</strong>.{' '}
          <Link to="/spending?status=pending">Review pending</Link>.
        </InlineNotice>
      ) : null}

      {!hasData ? (
        <Card tone="sage">
          <CardHeader
            eyebrow="First three steps"
            title="A useful plan in a few minutes"
            description="You do not need to set up everything. Start with the pieces that remove the most uncertainty."
          />
          <CardBody>
            <ol className="start-steps">
              <li>
                <span className="start-steps__num">1</span>
                <div>
                  <strong>Add one income source</strong>
                  <p>So Harbor knows when the next payday arrives and where the window ends.</p>
                </div>
                <ButtonLink to="/income" size="sm" variant="secondary">
                  Add
                </ButtonLink>
              </li>
              <li>
                <span className="start-steps__num">2</span>
                <div>
                  <strong>Add the bills you do not want to forget</strong>
                  <p>Rent, phone, subscriptions — anything that repeats.</p>
                </div>
                <ButtonLink to="/bills" size="sm" variant="secondary">
                  Add
                </ButtonLink>
              </li>
              <li>
                <span className="start-steps__num">3</span>
                <div>
                  <strong>Log one expense</strong>
                  <p>It takes a few seconds and makes the dashboard real.</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openQuickAdd({ type: 'expense', date: today })}
                >
                  Add
                </Button>
              </li>
            </ol>
            {!settings.sampleDataLoaded ? (
              <div className="start-steps__sample">
                <span>Want to look around first?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void actions.seedSample()}
                  disabled={busy}
                >
                  Load labelled sample data
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {hasData ? (
        <>
          {!focusMode ? (
            <div className="metric-grid">
              <Card className="metric-card">
                <p className="metric__label">Next payday</p>
                <p className="metric__value">
                  {breakdown.nextPayday
                    ? formatDateOnly(breakdown.nextPayday, locale, 'medium')
                    : 'No schedule yet'}
                </p>
                <p className="metric__note">
                  {breakdown.nextPayday
                    ? `${formatMoney(breakdown.nextPaydayAmountMinor, currency, locale)} expected · ${relativeDayLabel(breakdown.nextPayday, today, locale)}`
                    : 'Add an income source to project paydays.'}
                </p>
              </Card>
              <Card className="metric-card">
                <p className="metric__label">Reserved bills</p>
                <p className="metric__value">
                  {formatMoney(breakdown.reservedBillsMinor, currency, locale)}
                </p>
                <p className="metric__note">
                  {breakdown.reservedBillCount === 0
                    ? 'Nothing due in this window.'
                    : `${breakdown.reservedBillCount} unpaid ${breakdown.reservedBillCount === 1 ? 'occurrence' : 'occurrences'} through the window.`}
                </p>
              </Card>
              <Card className="metric-card">
                <p className="metric__label">Spent this month</p>
                <p className="metric__value">
                  {formatMoney(breakdown.spentThisMonthMinor, currency, locale)}
                </p>
                <p className="metric__note">
                  Received {formatMoney(breakdown.incomeThisMonthMinor, currency, locale)} this
                  month.
                </p>
              </Card>
              <Card className="metric-card">
                <p className="metric__label">Expected in this window</p>
                <p className="metric__value">
                  {formatMoney(breakdown.expectedIncomeInWindowMinor, currency, locale)}
                </p>
                <p className="metric__note">
                  {breakdown.expectedIncomeInWindowMinor === 0 && breakdown.nextPayday
                    ? `Next payday is ${formatDateOnly(breakdown.nextPayday, locale, 'medium')}, just after this window. Never added to safe to spend.`
                    : 'Includes any paydays already received. Never added to safe to spend.'}
                </p>
              </Card>
            </div>
          ) : null}

          <div className="dashboard-grid">
            <Card className={`dashboard-grid__wide${focusMode ? ' dashboard-grid__full' : ''}`}>
              <CardHeader
                title="What is coming up"
                description={
                  scopedUpcoming.length === 0
                    ? 'No unpaid bills in the next 30 days.'
                    : 'Unpaid bills, soonest first.'
                }
                action={
                  <ButtonLink to="/bills" variant="ghost" size="sm">
                    All bills
                  </ButtonLink>
                }
              />
              <CardBody>
                {scopedUpcoming.length === 0 ? (
                  <EmptyState
                    icon="receipt"
                    title="Nothing due soon"
                    description="When you add a bill, its unpaid due dates appear here."
                    action={
                      <ButtonLink to="/bills" variant="secondary" size="sm" icon="plus">
                        Add a bill
                      </ButtonLink>
                    }
                  />
                ) : (
                  <ul className="row-list">
                    {scopedUpcoming.map((occurrence: BillOccurrence) => {
                      const bill = bills.find((row) => row.id === occurrence.billId);
                      return (
                        <BillOccurrenceRow
                          key={occurrence.id}
                          occurrence={occurrence}
                          bill={bill}
                          category={bill?.categoryId ? categoryMap.get(bill.categoryId) : undefined}
                          currency={currency}
                          locale={locale}
                          dateFormat={settings.dateFormat}
                          today={today}
                          busy={busy}
                          onMarkPaid={() => void actions.markBillPaid(occurrence.id)}
                          onSkip={() => void actions.skipBill(occurrence.id)}
                        />
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>

            {!focusMode ? (
              <>
                <Card className="dashboard-grid__wide">
                  <CardHeader
                    title="Recent activity"
                    description="The last few things you recorded."
                    action={
                      <ButtonLink to="/spending" variant="ghost" size="sm">
                        View all
                      </ButtonLink>
                    }
                  />
                  <CardBody>
                    {scopedTransactions.length === 0 ? (
                      <EmptyState
                        icon="wallet"
                        title="No spending logged yet"
                        description="Add an expense to see it here and keep the picture honest."
                        action={
                          <Button
                            variant="secondary"
                            size="sm"
                            icon="plus"
                            onClick={() => openQuickAdd({ type: 'expense', date: today })}
                          >
                            Add expense
                          </Button>
                        }
                      />
                    ) : (
                      <ul className="row-list">
                        {scopedTransactions.slice(0, 5).map((transaction) => (
                          <TransactionRow
                            key={transaction.id}
                            transaction={transaction}
                            category={
                              transaction.categoryId
                                ? categoryMap.get(transaction.categoryId)
                                : undefined
                            }
                            currency={currency}
                            locale={locale}
                          />
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>

                <Card className="dashboard-grid__progress">
                  <CardHeader eyebrow="Progress" title="Debt & savings" />
                  <CardBody>
                    <div className="progress-summary">
                      <div className="progress-summary__row">
                        <div>
                          <p className="progress-summary__label">Debt remaining</p>
                          <p className="progress-summary__value">
                            {formatMoney(debtTotal, currency, locale)}
                          </p>
                        </div>
                        <ButtonLink to="/debt" variant="ghost" size="sm">
                          Open
                        </ButtonLink>
                      </div>
                      {activeDebts.slice(0, 2).map((debt) => {
                        const summary = debtSummary(debt, transactions);
                        return (
                          <ProgressBar
                            key={debt.id}
                            label={debt.name}
                            value={summary.progress}
                            tone="rose"
                            size="sm"
                            showValue={false}
                          />
                        );
                      })}
                      <div className="progress-summary__divider" />
                      <div className="progress-summary__row">
                        <div>
                          <p className="progress-summary__label">Saved across goals</p>
                          <p className="progress-summary__value">
                            {formatMoney(savingsTotal, currency, locale)}
                          </p>
                        </div>
                        <ButtonLink to="/savings" variant="ghost" size="sm">
                          Open
                        </ButtonLink>
                      </div>
                      {activeGoals.slice(0, 2).map((goal) => {
                        const summary = savingsSummary(goal, savingsEntries);
                        return (
                          <ProgressBar
                            key={goal.id}
                            label={`${goal.name} · ${formatMoneyShort(summary.currentMinor, currency, locale)} of ${formatMoneyShort(goal.targetMinor, currency, locale)}`}
                            value={summary.progress}
                            tone="sage"
                            size="sm"
                            showValue={false}
                          />
                        );
                      })}
                      {activeDebts.length === 0 && activeGoals.length === 0 ? (
                        <p className="progress-summary__empty">
                          Add a debt or savings goal to see gentle progress here.
                        </p>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              </>
            ) : null}
          </div>

          <Card>
            <CardHeader
              title="How this is calculated"
              description="The full arithmetic behind today's number."
            />
            <CardBody>
              <Disclosure summary="Show the safe-to-spend breakdown">
                <div className="breakdown">
                  <div className="breakdown__row">
                    <span>Starting balance</span>
                    <span>{formatMoney(breakdown.startingBalanceMinor, currency, locale)}</span>
                  </div>
                  <div className="breakdown__row">
                    <span>+ Received income</span>
                    <span>{formatMoney(breakdown.receivedIncomeMinor, currency, locale)}</span>
                  </div>
                  <div className="breakdown__row">
                    <span>− Spending</span>
                    <span>{formatMoney(breakdown.actualSpendingMinor, currency, locale)}</span>
                  </div>
                  <div className="breakdown__row">
                    <span>− Savings contributions</span>
                    <span>
                      {formatMoney(breakdown.savingsContributionsMinor, currency, locale)}
                    </span>
                  </div>
                  <div className="breakdown__row">
                    <span>+ Savings withdrawals</span>
                    <span>{formatMoney(breakdown.savingsWithdrawalsMinor, currency, locale)}</span>
                  </div>
                  <div className="breakdown__row breakdown__row--total">
                    <span>Cash on hand</span>
                    <span>{formatMoney(breakdown.cashOnHandMinor, currency, locale)}</span>
                  </div>
                  <div className="breakdown__row">
                    <span>− Unpaid bills through the window</span>
                    <span>{formatMoney(breakdown.reservedBillsMinor, currency, locale)}</span>
                  </div>
                  <div className="breakdown__row">
                    <span>− Cushion</span>
                    <span>{formatMoney(breakdown.cushionMinor, currency, locale)}</span>
                  </div>
                  <div className="breakdown__row breakdown__row--total">
                    <span>Safe to spend</span>
                    <span>{formatMoney(breakdown.safeToSpendMinor, currency, locale)}</span>
                  </div>
                </div>
                <p className="breakdown__note">
                  Expected income is not included. Only cleared transactions dated today or earlier
                  affect cash on hand. Pending spending is shown separately. The window is{' '}
                  {formatDateOnly(breakdown.planWindow.start, locale, 'medium')} through{' '}
                  {formatDateOnly(breakdown.planWindow.end, locale, 'medium')}.
                </p>
              </Disclosure>
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
