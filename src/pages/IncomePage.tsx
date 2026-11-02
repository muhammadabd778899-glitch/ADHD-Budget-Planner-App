import { useMemo, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, EmptyState, InlineNotice } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { PaydayRow, TransactionRow } from '@/components/finance/rows';
import { IncomeFormDialog } from '@/components/finance/IncomeFormDialog';
import { useAppData } from '@/state/AppDataProvider';
import type { IncomeFrequency, IncomeSource, PlannedPayday, Transaction } from '@/domain/types';
import { projectPaydays, nextPayday } from '@/domain/planning';
import {
  addDays,
  addMonthsClamped,
  formatDateOnly,
  formatMonth,
  monthKey,
  startOfMonth,
  endOfMonth,
  todayISO,
} from '@/lib/dates';
import { formatMoney } from '@/lib/money';

const FREQUENCY_LABEL: Record<IncomeFrequency, string> = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  semimonthly: 'Twice a month · 1st & 15th',
  monthly: 'Once a month',
  'one-time': 'One time',
  irregular: 'Irregular',
};

const EMPTY_SOURCES: IncomeSource[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];

export function IncomePage() {
  const { snapshot, actions, busy, openQuickAdd } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeSource | null>(null);
  const [removeTarget, setRemoveTarget] = useState<IncomeSource | null>(null);
  const today = todayISO();

  const sources = snapshot?.incomeSources ?? EMPTY_SOURCES;
  const transactions = snapshot?.transactions ?? EMPTY_TRANSACTIONS;
  const settings = snapshot?.settings;
  const currency = settings?.currency ?? 'USD';
  const locale = settings?.locale ?? 'en-US';

  const receivedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const transaction of transactions) {
      if (
        transaction.type === 'income' &&
        transaction.status === 'cleared' &&
        transaction.incomeSourceId
      ) {
        keys.add(`${transaction.incomeSourceId}__${transaction.date}`);
      }
    }
    return keys;
  }, [transactions]);

  const upcoming = useMemo(() => {
    const rows = projectPaydays(sources, addDays(today, 1), addMonthsClamped(today, 18)).filter(
      (payday) => !receivedKeys.has(`${payday.sourceId}__${payday.date}`),
    );
    const byDate = new Map<string, PlannedPayday>();
    for (const row of rows) {
      const existing = byDate.get(row.date);
      if (existing) {
        existing.entries.push(row);
        existing.totalMinor += row.amountMinor;
      } else {
        byDate.set(row.date, { date: row.date, totalMinor: row.amountMinor, entries: [row] });
      }
    }
    return [...byDate.values()].slice(0, 10);
  }, [sources, today, receivedKeys]);

  const expectedThisMonth = useMemo(() => {
    if (!settings) return 0;
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    return projectPaydays(sources, monthStart, monthEnd).reduce(
      (total, row) => total + row.amountMinor,
      0,
    );
  }, [sources, today, settings]);

  const receivedThisMonth = transactions
    .filter(
      (transaction) =>
        transaction.type === 'income' &&
        transaction.status === 'cleared' &&
        monthKey(transaction.date) === monthKey(today),
    )
    .reduce((total, transaction) => total + transaction.amountMinor, 0);
  const next = nextPayday(sources, today);
  const receivedHistory = transactions
    .filter((transaction) => transaction.type === 'income')
    .slice(0, 10);
  const incomeCategories = (snapshot?.categories ?? []).filter(
    (category) => category.kind === 'income' && !category.archived,
  );
  const defaultCategory =
    incomeCategories.find((category) => category.name === 'Paycheck')?.id ??
    incomeCategories[0]?.id;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(source: IncomeSource) {
    setEditing(source);
    setFormOpen(true);
  }

  function receive(payday: PlannedPayday) {
    const first = payday.entries[0];
    if (!first) return;
    const source = sources.find((row) => row.id === first.sourceId);
    openQuickAdd({
      type: 'income',
      amountMinor: source?.amountMinor ?? payday.totalMinor,
      description: source?.name ?? 'Received income',
      categoryId: defaultCategory,
      date: payday.date,
      incomeSourceId: payday.entries.length === 1 ? first.sourceId : null,
      sample: source?.sample ?? false,
    });
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Plan"
        title="Paydays"
        description="See when money is expected, and record it only when it actually arrives."
        actions={
          <Button icon="plus" onClick={openNew}>
            Add income
          </Button>
        }
      />

      <div className="metric-grid">
        <Card className="metric-card">
          <p className="metric__label">Next payday</p>
          <p className="metric__value">
            {next ? formatDateOnly(next.date, locale, 'medium') : 'No projection'}
          </p>
          <p className="metric__note">
            {next
              ? `${formatMoney(next.totalMinor, currency, locale)} expected`
              : 'Add an active income source to project ahead.'}
          </p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Expected this month</p>
          <p className="metric__value">{formatMoney(expectedThisMonth, currency, locale)}</p>
          <p className="metric__note">A projection. Not counted as cash on hand.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Received this month</p>
          <p className="metric__value">{formatMoney(receivedThisMonth, currency, locale)}</p>
          <p className="metric__note">
            Cleared income transactions in {formatMonth(today, locale)}.
          </p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Active sources</p>
          <p className="metric__value">{sources.filter((source) => source.active).length}</p>
          <p className="metric__note">
            {sources.filter((source) => !source.active).length} paused.
          </p>
        </Card>
      </div>

      <InlineNotice tone="info" title="Expected is not received">
        A projected payday is a plan, not cash. Mark it received when the money lands; that creates
        the income transaction Tide counts. Expected money never increases safe to spend.
      </InlineNotice>

      <div className="two-column">
        <Card>
          <CardHeader
            title="Upcoming paydays"
            description={
              upcoming.length === 0
                ? 'Nothing else projected in the next 18 months.'
                : 'Projected from your active sources. Mark each one received when it lands.'
            }
            action={
              <Button variant="ghost" size="sm" onClick={() => openQuickAdd({ type: 'income' })}>
                Add received income
              </Button>
            }
          />
          <CardBody>
            {upcoming.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="No upcoming paydays"
                description={
                  sources.length === 0
                    ? 'Add an income source to see projected paydays and plan until the next one.'
                    : 'Your active schedules do not project a future payday. Check paused or ended sources.'
                }
                action={
                  <Button size="sm" variant="secondary" icon="plus" onClick={openNew}>
                    Add income
                  </Button>
                }
              />
            ) : (
              <ul className="row-list">
                {upcoming.map((payday) => (
                  <PaydayRow
                    key={payday.date}
                    payday={payday}
                    currency={currency}
                    locale={locale}
                    dateFormat={settings?.dateFormat ?? 'medium'}
                    onReceive={() => receive(payday)}
                    busy={busy}
                  />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Income sources"
            description="Pause anything that is not current. History is kept."
            action={
              <Button variant="ghost" size="sm" icon="plus" onClick={openNew}>
                Add
              </Button>
            }
          />
          <CardBody>
            {sources.length === 0 ? (
              <EmptyState
                icon="wallet"
                title="No income sources yet"
                description="Add your paycheck or any money that arrives on a schedule."
                action={
                  <Button size="sm" variant="secondary" icon="plus" onClick={openNew}>
                    Add income
                  </Button>
                }
              />
            ) : (
              <ul className="source-list">
                {sources.map((source) => {
                  const sourceNext =
                    source.active && source.frequency !== 'irregular'
                      ? projectPaydays([source], addDays(today, 1), addMonthsClamped(today, 24))[0]
                      : null;
                  return (
                    <li key={source.id} className="source-card">
                      <div className="source-card__top">
                        <div>
                          <div className="source-card__title-line">
                            <h3>{source.name}</h3>
                            {!source.active ? <Badge tone="neutral">Paused</Badge> : null}
                            {source.sample ? <Badge tone="info">Sample</Badge> : null}
                          </div>
                          <p className="source-card__meta">
                            {formatMoney(source.amountMinor, currency, locale)} ·{' '}
                            {FREQUENCY_LABEL[source.frequency]}
                          </p>
                          <p className="source-card__meta">
                            {source.frequency === 'irregular'
                              ? 'Record income manually when it arrives.'
                              : sourceNext
                                ? `Next: ${formatDateOnly(sourceNext.date, locale, 'medium')}`
                                : 'No future date projected.'}
                          </p>
                        </div>
                        <div className="source-card__actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon="edit"
                            aria-label={`Edit ${source.name}`}
                            onClick={() => openEdit(source)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void actions.setIncomeActive(source.id, !source.active)}
                            disabled={busy}
                          >
                            {source.active ? 'Pause' : 'Resume'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon="trash"
                            aria-label={`Remove ${source.name}`}
                            onClick={() => setRemoveTarget(source)}
                          />
                        </div>
                      </div>
                      {source.notes ? <p className="source-card__note">{source.notes}</p> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Received income"
          description="The last ten income transactions. These are the ones counted in cash on hand."
          action={
            <ButtonLink to="/spending" variant="ghost" size="sm">
              All transactions
            </ButtonLink>
          }
        />
        <CardBody>
          {receivedHistory.length === 0 ? (
            <EmptyState
              icon="wallet"
              title="No received income yet"
              description="When a payday lands, record it here. Only recorded money counts."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  icon="plus"
                  onClick={() => openQuickAdd({ type: 'income' })}
                >
                  Add received income
                </Button>
              }
            />
          ) : (
            <ul className="row-list">
              {receivedHistory.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  category={
                    transaction.categoryId
                      ? snapshot?.categories.find(
                          (category) => category.id === transaction.categoryId,
                        )
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

      <IncomeFormDialog open={formOpen} onClose={() => setFormOpen(false)} source={editing} />
      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) {
            void actions
              .removeIncome(removeTarget.id)
              .then(() => setRemoveTarget(null))
              .catch(() => undefined);
          }
        }}
        title={removeTarget ? `Remove ${removeTarget.name}?` : 'Remove income source?'}
        description="The schedule stops projecting paydays. Any income you already recorded stays exactly as it is."
        confirmLabel="Remove schedule"
      />
    </div>
  );
}
