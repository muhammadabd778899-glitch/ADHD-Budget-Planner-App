import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Badge, Disclosure, EmptyState, InlineNotice, ProgressBar } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { SavingsEntryDialog } from '@/components/finance/SavingsEntryDialog';
import { SavingsGoalFormDialog } from '@/components/finance/SavingsGoalFormDialog';
import { useAppData } from '@/state/AppDataProvider';
import {
  savingsSummary,
  totalSavingsMinor,
  suggestedSetAsideMinor,
  contributedThisMonthMinor,
} from '@/domain/savings';
import type { SavingsEntry, SavingsGoal } from '@/domain/types';
import { formatDateOnly, formatMonth, monthKey, todayISO } from '@/lib/dates';
import { formatMoney, formatMoneyShort } from '@/lib/money';

type EntryMode = 'contribute' | 'withdraw';

type ProgressTone = 'sage' | 'sky' | 'lavender' | 'apricot' | 'gold';

const PROGRESS_TONES: Record<string, ProgressTone> = {
  sage: 'sage',
  sky: 'sky',
  lavender: 'lavender',
  apricot: 'apricot',
  gold: 'gold',
  rose: 'apricot',
  clay: 'apricot',
  stone: 'sage',
};

function goalTone(color: string): ProgressTone {
  return PROGRESS_TONES[color] ?? 'sage';
}

export function SavingsPage() {
  const { snapshot, actions, busy } = useAppData();
  const today = todayISO();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [entryTarget, setEntryTarget] = useState<{
    goal: SavingsGoal;
    currentMinor: number;
    mode: EntryMode;
    amountMinor: number;
  } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SavingsGoal | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<SavingsEntry | null>(null);

  const settings = snapshot?.settings;
  const currency = settings?.currency ?? 'USD';
  const locale = settings?.locale ?? 'en-US';
  const goals = snapshot?.savingsGoals ?? [];
  const entries = snapshot?.savingsEntries ?? [];

  const activeGoals = goals.filter((goal) => !goal.archived);
  const archivedGoals = goals.filter((goal) => goal.archived);
  const totalSaved = totalSavingsMinor(activeGoals, entries);
  const totalTargets = activeGoals.reduce((total, goal) => total + goal.targetMinor, 0);
  const monthlyContributions = entries
    .filter((entry) => entry.amountMinor > 0 && monthKey(entry.date) === monthKey(today))
    .reduce((total, entry) => total + entry.amountMinor, 0);
  const monthlyWithdrawals = entries
    .filter((entry) => entry.amountMinor < 0 && monthKey(entry.date) === monthKey(today))
    .reduce((total, entry) => total + Math.abs(entry.amountMinor), 0);
  const incomeThisMonthMinor = (snapshot?.transactions ?? []).reduce((total, transaction) => {
    if (transaction.type !== 'income' || transaction.status !== 'cleared') return total;
    return monthKey(transaction.date) === monthKey(today) ? total + transaction.amountMinor : total;
  }, 0);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(goal: SavingsGoal) {
    setEditing(goal);
    setFormOpen(true);
  }

  function openEntry(goal: SavingsGoal, mode: EntryMode, amountMinor = 0) {
    const summary = savingsSummary(goal, entries);
    setEntryTarget({ goal, currentMinor: summary.currentMinor, mode, amountMinor });
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Track"
        title="Savings"
        description="Goals are a place to watch progress. Moving money into savings reduces spendable cash; moving it out brings that cash back."
        actions={
          <Button icon="plus" onClick={openNew}>
            Add goal
          </Button>
        }
      />

      <InlineNotice tone="info" title="Savings are separate from spending">
        A contribution is a transfer, not an expense. It is not counted as spending in reports, but
        it does reduce cash on hand in safe to spend. Withdrawals do the reverse.
      </InlineNotice>

      <div className="metric-grid">
        <Card className="metric-card">
          <p className="metric__label">Saved across goals</p>
          <p className="metric__value">{formatMoney(totalSaved, currency, locale)}</p>
          <p className="metric__note">
            {activeGoals.length === 0
              ? 'Add a goal to start watching progress.'
              : `Across ${activeGoals.length} active ${activeGoals.length === 1 ? 'goal' : 'goals'}.`}
          </p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Combined targets</p>
          <p className="metric__value">{formatMoney(totalTargets, currency, locale)}</p>
          <p className="metric__note">Progress is visual; an amount can pass its target.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Added this month</p>
          <p className="metric__value">{formatMoney(monthlyContributions, currency, locale)}</p>
          <p className="metric__note">In {formatMonth(today, locale)}.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Withdrawn this month</p>
          <p className="metric__value">{formatMoney(monthlyWithdrawals, currency, locale)}</p>
          <p className="metric__note">Money brought back to spendable cash.</p>
        </Card>
      </div>

      {activeGoals.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="piggy"
              title="No savings goals yet"
              description="A goal can be an emergency fund, a trip, or anything you are setting money aside for. Start with one."
              action={
                <Button variant="secondary" size="sm" icon="plus" onClick={openNew}>
                  Add a goal
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="savings-grid">
          {activeGoals.map((goal) => {
            const summary = savingsSummary(goal, entries);
            const contributed = contributedThisMonthMinor(goal, entries, today);
            const suggested = suggestedSetAsideMinor(goal, incomeThisMonthMinor, contributed);
            const goalEntries = entries
              .filter((entry) => entry.goalId === goal.id)
              .sort(
                (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
              );
            return (
              <Card key={goal.id} className="savings-card">
                <CardHeader
                  eyebrow={
                    goal.targetDate
                      ? `Target ${formatDateOnly(goal.targetDate, locale, 'medium')}`
                      : 'No target date'
                  }
                  title={
                    <span className="title-with-badges">
                      <span className={`goal-dot goal-dot--${goal.color}`} aria-hidden="true" />
                      {goal.name}
                      {goal.kind === 'sinking' ? <Badge tone="info">Sinking fund</Badge> : null}
                      {goal.sample ? <Badge tone="info">Sample</Badge> : null}
                    </span>
                  }
                  action={
                    <div className="inline-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="plus"
                        onClick={() => openEntry(goal, 'contribute')}
                      >
                        Add money
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="minus"
                        onClick={() => openEntry(goal, 'withdraw')}
                        disabled={summary.currentMinor <= 0}
                      >
                        Withdraw
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="edit"
                        aria-label={`Edit ${goal.name}`}
                        onClick={() => openEdit(goal)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="trash"
                        aria-label={`Archive ${goal.name}`}
                        onClick={() => setArchiveTarget(goal)}
                      />
                    </div>
                  }
                />
                <CardBody>
                  <div className="savings-card__amounts">
                    <div>
                      <span>Saved</span>
                      <strong>{formatMoney(summary.currentMinor, currency, locale)}</strong>
                    </div>
                    <div>
                      <span>Remaining</span>
                      <strong>
                        {summary.remainingMinor > 0
                          ? formatMoney(summary.remainingMinor, currency, locale)
                          : 'Target reached'}
                      </strong>
                    </div>
                    <div>
                      <span>Target</span>
                      <strong>{formatMoneyShort(goal.targetMinor, currency, locale)}</strong>
                    </div>
                    {goal.kind === 'sinking' &&
                    (goal.monthlyTargetMinor > 0 || goal.autoSavePercent > 0) ? (
                      <div>
                        <span>Monthly</span>
                        <strong>
                          {goal.monthlyTargetMinor > 0
                            ? formatMoneyShort(goal.monthlyTargetMinor, currency, locale)
                            : `${goal.autoSavePercent}% of income`}
                        </strong>
                      </div>
                    ) : null}
                  </div>
                  <ProgressBar
                    label={`${goal.name} progress`}
                    value={summary.progress}
                    tone={goalTone(goal.color)}
                  />
                  {goal.kind === 'sinking' &&
                  (goal.monthlyTargetMinor > 0 || goal.autoSavePercent > 0) ? (
                    <div className="sinking-suggestion">
                      <div>
                        <span>Suggested set-aside this month</span>
                        <strong>{formatMoney(Math.max(0, suggested), currency, locale)}</strong>
                        <p className="disclosure-note">
                          {contributed > 0
                            ? `${formatMoney(contributed, currency, locale)} added this month.`
                            : 'Nothing added yet this month.'}{' '}
                          Harbor only suggests; you decide when money moves.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="plus"
                        disabled={suggested <= 0}
                        onClick={() => openEntry(goal, 'contribute', suggested)}
                      >
                        Set aside
                      </Button>
                    </div>
                  ) : null}
                  {goal.notes ? <p className="source-card__note">{goal.notes}</p> : null}

                  <Disclosure summary={`Money movement (${goalEntries.length})`}>
                    {goalEntries.length === 0 ? (
                      <p className="muted-copy">
                        No entries yet. Use Add money when you move something aside.
                      </p>
                    ) : (
                      <ul className="entry-list">
                        {goalEntries.map((entry) => (
                          <li className="entry-row" key={entry.id}>
                            <div>
                              <span
                                className={
                                  entry.amountMinor > 0
                                    ? 'entry-row__amount entry-row__amount--in'
                                    : 'entry-row__amount entry-row__amount--out'
                                }
                              >
                                {entry.amountMinor > 0 ? '+' : '−'}
                                {formatMoney(Math.abs(entry.amountMinor), currency, locale)}
                              </span>
                              <span className="entry-row__meta">
                                {formatDateOnly(entry.date, locale, 'medium')}
                                {entry.note ? ` · ${entry.note}` : ''}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon="trash"
                              aria-label={`Delete savings entry from ${formatDateOnly(entry.date, locale, 'medium')}`}
                              onClick={() => setDeleteEntryTarget(entry)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="disclosure-note">
                      Deleting an entry recalculates progress and cash on hand. It does not touch
                      the goal itself.
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
          title="How savings affects your plan"
          description="A transfer model that avoids double counting."
        />
        <CardBody>
          <ul className="plain-list">
            <li>
              Saved so far = money already saved when the goal was created + every entry since.
            </li>
            <li>Contributions are positive entries and reduce cash on hand.</li>
            <li>Withdrawals are negative entries and bring cash back.</li>
            <li>Savings entries are never counted as spending in reports.</li>
            <li>
              The cushion in Settings is separate reserved money. A goal does not reserve anything
              by itself.
            </li>
          </ul>
          <ButtonLink to="/settings" variant="ghost" size="sm" iconAfter="arrow-right">
            Adjust the cushion
          </ButtonLink>
        </CardBody>
      </Card>

      {archivedGoals.length > 0 ? (
        <Card>
          <CardHeader
            title="Archived goals"
            description="Their entries are kept. Archived goals are left out of the totals above."
          />
          <CardBody>
            <ul className="source-list">
              {archivedGoals.map((goal) => {
                const summary = savingsSummary(goal, entries);
                return (
                  <li className="source-card" key={goal.id}>
                    <div className="source-card__top">
                      <div>
                        <div className="source-card__title-line">
                          <h3>{goal.name}</h3>
                          <Badge tone="neutral">Archived</Badge>
                        </div>
                        <p className="source-card__meta">
                          {formatMoney(summary.currentMinor, currency, locale)} saved of{' '}
                          {formatMoney(goal.targetMinor, currency, locale)}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void actions.restoreGoal(goal.id)}
                        disabled={busy}
                      >
                        Restore
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <SavingsGoalFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        goal={editing}
      />

      <SavingsEntryDialog
        open={entryTarget !== null}
        onClose={() => setEntryTarget(null)}
        goal={entryTarget?.goal ?? null}
        currentMinor={entryTarget?.currentMinor ?? 0}
        initialMode={entryTarget?.mode ?? 'contribute'}
        initialAmountMinor={entryTarget?.amountMinor ?? 0}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) {
            void actions
              .archiveGoal(archiveTarget.id)
              .then(() => setArchiveTarget(null))
              .catch(() => undefined);
          }
        }}
        title={archiveTarget ? `Archive ${archiveTarget.name}?` : 'Archive this goal?'}
        description="It will stop appearing in totals, but every entry stays in your history. You can restore it later."
        confirmLabel="Archive goal"
        busy={busy}
      />

      <ConfirmDialog
        open={deleteEntryTarget !== null}
        onClose={() => setDeleteEntryTarget(null)}
        onConfirm={() => {
          if (deleteEntryTarget) {
            void actions
              .deleteSavingsEntry(deleteEntryTarget.id)
              .then(() => setDeleteEntryTarget(null))
              .catch(() => undefined);
          }
        }}
        title="Delete this savings entry?"
        description={
          deleteEntryTarget
            ? `${deleteEntryTarget.amountMinor > 0 ? 'A contribution' : 'A withdrawal'} of ${formatMoney(
                Math.abs(deleteEntryTarget.amountMinor),
                currency,
                locale,
              )} on ${formatDateOnly(deleteEntryTarget.date, locale, 'medium')} will be removed. Goal progress and cash on hand will be recalculated.`
            : 'This entry will be removed.'
        }
        confirmLabel="Delete entry"
        busy={busy}
      />
    </div>
  );
}
