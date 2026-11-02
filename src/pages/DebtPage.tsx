import { useMemo, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Badge, Disclosure, EmptyState, InlineNotice, ProgressBar } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { TransactionRow } from '@/components/finance/rows';
import { DebtFormDialog } from '@/components/finance/DebtFormDialog';
import { DebtPaymentDialog } from '@/components/finance/DebtPaymentDialog';
import { useAppData } from '@/state/AppDataProvider';
import { debtSummary, estimatePayoff, totalDebtMinor, type DebtSummary } from '@/domain/debt';
import type { Debt, DebtKind, Transaction, Category } from '@/domain/types';
import { formatDateOnly, formatMonth, monthKey, todayISO } from '@/lib/dates';
import { formatMoney, formatMoneyShort } from '@/lib/money';
import { formatBps } from '@/lib/rates';

const KIND_LABEL: Record<DebtKind, string> = {
  'credit-card': 'Credit card',
  loan: 'Personal loan',
  'student-loan': 'Student loan',
  auto: 'Auto loan',
  medical: 'Medical debt',
  other: 'Other debt',
};

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_CATEGORIES: Category[] = [];

function payoffCopy(
  balanceMinor: number,
  rateBps: number | null,
  paymentMinor: number | null,
  currency: string,
  locale: string,
) {
  const estimate = estimatePayoff(balanceMinor, rateBps, paymentMinor);
  if (balanceMinor <= 0) {
    return {
      headline: 'This balance is paid off',
      detail: 'Any extra payment shows as a credit balance rather than disappearing.',
      tone: 'positive' as const,
    };
  }
  if (!estimate.feasible) {
    if (estimate.reason === 'missing-payment') {
      return {
        headline: 'Add a minimum payment for an estimate',
        detail: 'Without a monthly payment amount, Tide cannot estimate a payoff time.',
        tone: 'neutral' as const,
      };
    }
    if (estimate.reason === 'payment-too-small') {
      return {
        headline: 'This payment may not reduce the balance',
        detail:
          'At this interest rate the entered payment is lower than the first month of interest.',
        tone: 'warning' as const,
      };
    }
    return {
      headline: 'An estimate is not available',
      detail: 'The payment and interest rate do not produce steady progress. Check the details.',
      tone: 'warning' as const,
    };
  }
  return {
    headline: `About ${estimate.months} ${estimate.months === 1 ? 'month' : 'months'} to go`,
    detail: `${formatMoney(estimate.totalInterestMinor, currency, locale)} of interest in a simple estimate.`,
    tone: 'info' as const,
  };
}

export function DebtPage() {
  const { snapshot, actions, busy } = useAppData();
  const today = todayISO();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<DebtSummary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Debt | null>(null);

  const settings = snapshot?.settings;
  const currency = settings?.currency ?? 'USD';
  const locale = settings?.locale ?? 'en-US';
  const debts = snapshot?.debts ?? [];
  const transactions = snapshot?.transactions ?? EMPTY_TRANSACTIONS;
  const categories = snapshot?.categories ?? EMPTY_CATEGORIES;

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const activeDebts = debts.filter((debt) => !debt.archived);
  const archivedDebts = debts.filter((debt) => debt.archived);
  const summaries = useMemo(
    () =>
      activeDebts
        .map((debt) => debtSummary(debt, transactions))
        .sort((a, b) => b.currentBalanceMinor - a.currentBalanceMinor),
    [activeDebts, transactions],
  );

  const totalDebt = totalDebtMinor(activeDebts, transactions);
  const totalMinimum = activeDebts.reduce(
    (total, debt) => total + (debt.minimumPaymentMinor ?? 0),
    0,
  );
  const paidThisMonth = transactions
    .filter(
      (transaction) =>
        Boolean(transaction.debtId) &&
        transaction.type === 'expense' &&
        transaction.status === 'cleared' &&
        monthKey(transaction.date) === monthKey(today),
    )
    .reduce((total, transaction) => total + transaction.amountMinor, 0);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(debt: Debt) {
    setEditing(debt);
    setFormOpen(true);
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Track"
        title="Debt"
        description="Balances are reduced only by payments you record. No interest is posted automatically, so nothing is guessed on your behalf."
        actions={
          <Button icon="plus" onClick={openNew}>
            Add debt
          </Button>
        }
      />

      {activeDebts.length === 0 ? (
        <InlineNotice tone="info" title="Debt tracking is optional">
          Add an account if seeing the payoff progress would help. If it would only add noise, skip
          it. Tide works without this page.
        </InlineNotice>
      ) : null}

      <div className="metric-grid">
        <Card className="metric-card">
          <p className="metric__label">Total remaining</p>
          <p className="metric__value">{formatMoney(totalDebt, currency, locale)}</p>
          <p className="metric__note">Across {activeDebts.length} active debt accounts.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Minimum payments</p>
          <p className="metric__value">{formatMoney(totalMinimum, currency, locale)}</p>
          <p className="metric__note">Per month, from the amounts you entered.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Paid this month</p>
          <p className="metric__value">{formatMoney(paidThisMonth, currency, locale)}</p>
          <p className="metric__note">Recorded debt payments in {formatMonth(today, locale)}.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Progress</p>
          <p className="metric__value">
            {formatMoneyShort(
              activeDebts.reduce((total, debt) => {
                const summary = debtSummary(debt, transactions);
                return total + summary.paidMinor;
              }, 0),
              currency,
              locale,
            )}
          </p>
          <p className="metric__note">Total paid through Tide since each account was added.</p>
        </Card>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="card"
              title="No debt accounts yet"
              description="Add a credit card, loan, or any balance you want to watch. You can archive it later without losing payment history."
              action={
                <Button variant="secondary" size="sm" icon="plus" onClick={openNew}>
                  Add debt
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="debt-grid">
          {summaries.map((summary) => {
            const { debt } = summary;
            const current = summary.currentBalanceMinor;
            const payments = transactions.filter(
              (transaction) => transaction.debtId === debt.id && transaction.type === 'expense',
            );
            const copy = payoffCopy(
              current,
              debt.interestRateBps,
              debt.minimumPaymentMinor,
              currency,
              locale,
            );
            return (
              <Card key={debt.id} className="debt-card">
                <CardHeader
                  eyebrow={KIND_LABEL[debt.kind]}
                  title={
                    <span className="title-with-badges">
                      {debt.name}
                      {debt.sample ? <Badge tone="info">Sample</Badge> : null}
                      {current < 0 ? <Badge tone="positive">Credit balance</Badge> : null}
                    </span>
                  }
                  action={
                    <div className="inline-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="plus"
                        onClick={() => setPaymentTarget(summary)}
                      >
                        Payment
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="edit"
                        aria-label={`Edit ${debt.name}`}
                        onClick={() => openEdit(debt)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="trash"
                        aria-label={`Archive ${debt.name}`}
                        onClick={() => setArchiveTarget(debt)}
                      />
                    </div>
                  }
                />
                <CardBody>
                  <div className="debt-card__balance">
                    <span>{current < 0 ? 'Credit balance' : 'Current balance'}</span>
                    <strong>{formatMoney(current, currency, locale)}</strong>
                  </div>
                  <ProgressBar
                    label={`${formatMoney(summary.paidMinor, currency, locale)} paid`}
                    value={summary.progress}
                    tone="rose"
                    size="sm"
                  />
                  <div className="debt-card__facts">
                    <div>
                      <span>Minimum</span>
                      <strong>
                        {debt.minimumPaymentMinor !== null
                          ? formatMoney(debt.minimumPaymentMinor, currency, locale)
                          : 'Not set'}
                      </strong>
                    </div>
                    <div>
                      <span>Interest</span>
                      <strong>{formatBps(debt.interestRateBps)}</strong>
                    </div>
                    <div>
                      <span>Target date</span>
                      <strong>
                        {debt.targetPayoffDate
                          ? formatDateOnly(debt.targetPayoffDate, locale, 'medium')
                          : 'No date'}
                      </strong>
                    </div>
                  </div>

                  <div className={`estimate estimate--${copy.tone}`}>
                    <p className="estimate__headline">{copy.headline}</p>
                    <p className="estimate__detail">
                      {copy.detail}
                      {copy.tone === 'info'
                        ? ' Estimate only — not a promise or financial advice.'
                        : ''}
                    </p>
                  </div>

                  {debt.notes ? <p className="source-card__note">{debt.notes}</p> : null}

                  <Disclosure summary={`Payment history (${payments.length})`}>
                    {payments.length === 0 ? (
                      <p className="muted-copy">No payments recorded yet.</p>
                    ) : (
                      <ul className="row-list row-list--compact">
                        {payments.map((transaction) => (
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
                    <p className="disclosure-note">
                      Debt payments are expense transactions, so they also reduce cash on hand and
                      appear in reports. They are not counted twice.
                    </p>
                  </Disclosure>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader
          title="How the balance works"
          description="A simple, honest model instead of a hidden amortisation ledger."
        />
        <CardBody>
          <ul className="plain-list">
            <li>
              Current balance = the balance you entered − cleared payments linked to this debt.
            </li>
            <li>Each recorded payment creates exactly one expense transaction.</li>
            <li>
              Interest is not added automatically. If your balance changes because of interest, edit
              the debt balance to match the real statement.
            </li>
            <li>
              Overpayments show as a credit balance. Tide does not hide the number or force it to
              zero.
            </li>
            <li>
              The payoff estimate assumes a constant monthly payment and monthly compounding. It is
              a rough guide, not a promise.
            </li>
          </ul>
          <ButtonLink to="/reports" variant="ghost" size="sm" iconAfter="arrow-right">
            See spending and income reports
          </ButtonLink>
        </CardBody>
      </Card>

      {archivedDebts.length > 0 ? (
        <Card>
          <CardHeader
            title="Archived debts"
            description="Payment history is kept. Archived debts are left out of the totals above."
          />
          <CardBody>
            <ul className="source-list">
              {archivedDebts.map((debt) => (
                <li className="source-card" key={debt.id}>
                  <div className="source-card__top">
                    <div>
                      <div className="source-card__title-line">
                        <h3>{debt.name}</h3>
                        <Badge tone="neutral">Archived</Badge>
                      </div>
                      <p className="source-card__meta">
                        {KIND_LABEL[debt.kind]} · balance entered{' '}
                        {formatMoney(debt.balanceMinor, currency, locale)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void actions.restoreDebt(debt.id)}
                      disabled={busy}
                    >
                      Restore
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <DebtFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        debt={editing}
      />

      <DebtPaymentDialog
        open={paymentTarget !== null}
        onClose={() => setPaymentTarget(null)}
        debt={paymentTarget?.debt ?? null}
        currentBalanceMinor={paymentTarget?.currentBalanceMinor ?? 0}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) {
            void actions
              .archiveDebt(archiveTarget.id)
              .then(() => setArchiveTarget(null))
              .catch(() => undefined);
          }
        }}
        title={archiveTarget ? `Archive ${archiveTarget.name}?` : 'Archive this debt?'}
        description="It will stop appearing in totals, but every payment stays in your history. You can restore it later."
        confirmLabel="Archive debt"
        busy={busy}
      />
    </div>
  );
}
