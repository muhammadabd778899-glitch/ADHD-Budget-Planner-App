import { useMemo, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Disclosure, EmptyState, InlineNotice } from '@/components/ui/Feedback';
import { SegmentedControl } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAppData } from '@/state/AppDataProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { calculateSafeToSpend } from '@/domain/safeToSpend';
import { categoryBreakdown, monthSummary, monthlyTrend } from '@/domain/reports';
import type { CategoryTotal } from '@/domain/reports';
import type { Category, Transaction } from '@/domain/types';
import {
  addMonthsClamped,
  formatDateOnly,
  formatMonth,
  monthKey,
  startOfMonth,
  todayISO,
} from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { transactionsToCsv } from '@/lib/csv';
import { downloadFile, makeFilename } from '@/lib/storage';

type BreakdownType = 'expense' | 'income';

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_CATEGORIES: Category[] = [];

function CategoryBars({
  rows,
  currency,
  locale,
  type,
}: {
  rows: CategoryTotal[];
  currency: string;
  locale: string;
  type: BreakdownType;
}) {
  const max = rows[0]?.totalMinor ?? 0;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="chart"
        title={`No ${type === 'expense' ? 'spending' : 'income'} in this month`}
        description="Once a cleared transaction lands in this month, the category breakdown appears here."
      />
    );
  }
  return (
    <ul className="category-bars">
      {rows.map((row) => {
        const width = max <= 0 ? 0 : Math.max(2, Math.round((row.totalMinor / max) * 100));
        return (
          <li key={row.categoryId ?? 'uncategorised'} className="category-bars__row">
            <div className="category-bars__top">
              <span className="category-bars__name">
                <span className={`category-dot category-dot--${row.color}`} aria-hidden="true" />
                {row.name}
              </span>
              <span className="category-bars__amount">
                {formatMoney(row.totalMinor, currency, locale)}
                <span className="category-bars__share">{row.share}%</span>
              </span>
            </div>
            <div className="category-bars__track">
              <span
                className={`category-bars__fill category-bars__fill--${row.color}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ReportsPage() {
  const { snapshot } = useAppData();
  const toast = useToast();
  const today = todayISO();
  const currentMonth = startOfMonth(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('expense');

  const settings = snapshot?.settings;
  const currency = settings?.currency ?? 'USD';
  const locale = settings?.locale ?? 'en-US';
  const dateFormat = settings?.dateFormat ?? 'medium';
  const transactions = snapshot?.transactions ?? EMPTY_TRANSACTIONS;
  const categories = snapshot?.categories ?? EMPTY_CATEGORIES;
  const bills = snapshot?.bills ?? [];

  const summary = useMemo(
    () => monthSummary(transactions, categories, selectedMonth),
    [transactions, categories, selectedMonth],
  );
  const breakdown = useMemo(
    () =>
      categoryBreakdown(
        transactions,
        categories,
        selectedMonth,
        selectedMonth === currentMonth ? today : summary.month,
        breakdownType,
      ),
    [transactions, categories, selectedMonth, currentMonth, today, summary.month, breakdownType],
  );
  const trend = useMemo(() => monthlyTrend(transactions, today, 6), [transactions, today]);
  const maxTrend = Math.max(
    1,
    ...trend.flatMap((point) => [point.incomeMinor, point.expenseMinor]),
  );

  const plan = settings
    ? calculateSafeToSpend({
        settings,
        transactions,
        savingsEntries: snapshot?.savingsEntries ?? [],
        billOccurrences: snapshot?.billOccurrences ?? [],
        bills,
        incomeSources: snapshot?.incomeSources ?? [],
        today,
      })
    : null;

  const isCurrentMonth = selectedMonth >= currentMonth;
  const monthTransactions = transactions.filter(
    (transaction) => monthKey(transaction.date) === monthKey(selectedMonth),
  );
  const hasAnyRecord = transactions.length > 0 || (snapshot?.billOccurrences.length ?? 0) > 0;

  function moveMonth(offset: number) {
    setSelectedMonth(startOfMonth(addMonthsClamped(selectedMonth, offset)));
  }

  function exportMonth() {
    const csv = transactionsToCsv(monthTransactions, categories, currency, bills);
    downloadFile(makeFilename(`report-${monthKey(selectedMonth)}`, 'csv'), csv, 'text/csv');
    toast({
      tone: 'info',
      title: 'CSV downloaded',
      message:
        'This file contains your transaction details. Keep it somewhere private and delete it when you are done.',
    });
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Review"
        title="Reports"
        description="A calm look back. These numbers describe what happened; they are not a score or a judgment."
        actions={
          <>
            <Button
              variant="secondary"
              icon="download"
              onClick={exportMonth}
              disabled={monthTransactions.length === 0}
            >
              Export month CSV
            </Button>
            <ButtonLink to="/spending" variant="ghost" icon="wallet">
              Spending
            </ButtonLink>
          </>
        }
      />

      <div className="month-switcher" role="group" aria-label="Choose report month">
        <Button
          variant="ghost"
          iconOnly
          icon="chevron-right"
          className="month-switcher__prev"
          aria-label="Previous month"
          onClick={() => moveMonth(-1)}
        />
        <div className="month-switcher__label">
          <p className="eyebrow">Report month</p>
          <h2>{formatMonth(selectedMonth, locale)}</h2>
          {selectedMonth === currentMonth ? (
            <span>This month so far · through {formatDateOnly(today, locale, dateFormat)}</span>
          ) : (
            <span>Full calendar month</span>
          )}
        </div>
        <Button
          variant="ghost"
          iconOnly
          icon="chevron-right"
          aria-label="Next month"
          onClick={() => moveMonth(1)}
          disabled={isCurrentMonth}
        />
      </div>

      {!hasAnyRecord ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="chart"
              title="Reports fill in as you go"
              description="Add a transaction or pay a bill. Tide will show a clear monthly summary here without asking you to maintain anything extra."
              action={
                <ButtonLink to="/spending" variant="secondary" size="sm" icon="plus">
                  Add a transaction
                </ButtonLink>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="metric-grid">
            <Card className="metric-card">
              <p className="metric__label">Received income</p>
              <p className="metric__value">{formatMoney(summary.incomeMinor, currency, locale)}</p>
              <p className="metric__note">Cleared income in this month.</p>
            </Card>
            <Card className="metric-card">
              <p className="metric__label">Spending</p>
              <p className="metric__value">{formatMoney(summary.expenseMinor, currency, locale)}</p>
              <p className="metric__note">Cleared expenses, including bill and debt payments.</p>
            </Card>
            <Card className={`metric-card ${summary.netMinor < 0 ? 'metric-card--caution' : ''}`}>
              <p className="metric__label">Difference</p>
              <p className="metric__value">{formatMoney(summary.netMinor, currency, locale)}</p>
              <p className="metric__note">
                {summary.netMinor < 0
                  ? 'Spending was higher than recorded income this month. Context matters.'
                  : 'Recorded income minus cleared spending.'}
              </p>
            </Card>
            <Card className="metric-card">
              <p className="metric__label">Pending spending</p>
              <p className="metric__value">
                {formatMoney(summary.pendingExpenseMinor, currency, locale)}
              </p>
              <p className="metric__note">Shown separately and not counted above.</p>
            </Card>
          </div>

          {summary.pendingExpenseMinor > 0 ? (
            <InlineNotice tone="warning" title="Pending is not included in the totals">
              {formatMoney(summary.pendingExpenseMinor, currency, locale)} is pending in this month.
              Clear those transactions when they settle.
            </InlineNotice>
          ) : null}

          {plan ? (
            <Card tone="sage">
              <CardHeader
                eyebrow="Today's plan"
                title="Safe to spend right now"
                description="Reports look back; this number looks forward through your current planning window."
                action={
                  <ButtonLink to="/" variant="ghost" size="sm">
                    Open Today
                  </ButtonLink>
                }
              />
              <CardBody>
                <div className="report-plan">
                  <div>
                    <span>Safe to spend</span>
                    <strong
                      className={plan.safeToSpendMinor < 0 ? 'text-caution' : 'text-positive'}
                    >
                      {plan.safeToSpendMinor < 0 ? 'Over plan by ' : ''}
                      {formatMoney(Math.abs(plan.safeToSpendMinor), currency, locale)}
                    </strong>
                  </div>
                  <div>
                    <span>Window</span>
                    <strong>
                      {formatDateOnly(plan.planWindow.start, locale, 'medium')} –{' '}
                      {formatDateOnly(plan.planWindow.end, locale, 'medium')}
                    </strong>
                  </div>
                  <div>
                    <span>Reserved bills</span>
                    <strong>{formatMoney(plan.reservedBillsMinor, currency, locale)}</strong>
                  </div>
                  <div>
                    <span>Expected income</span>
                    <strong>
                      {formatMoney(plan.expectedIncomeInWindowMinor, currency, locale)}
                    </strong>
                  </div>
                </div>
                <p className="muted-copy">
                  Expected income is shown separately and is not part of safe to spend.
                </p>
              </CardBody>
            </Card>
          ) : null}

          <div className="reports-grid">
            <Card className="reports-grid__categories">
              <CardHeader
                title="Category breakdown"
                description="Where the month's cleared transactions went, largest first."
                action={
                  <SegmentedControl
                    label="Breakdown type"
                    value={breakdownType}
                    onChange={setBreakdownType}
                    options={[
                      { value: 'expense', label: 'Spending' },
                      { value: 'income', label: 'Income' },
                    ]}
                  />
                }
              />
              <CardBody>
                <CategoryBars
                  rows={breakdown}
                  currency={currency}
                  locale={locale}
                  type={breakdownType}
                />
                <p className="muted-copy">
                  Uncategorised entries are grouped into a labelled row. Percentages are rounded and
                  may not add to exactly 100%.
                </p>
              </CardBody>
            </Card>

            <Card className="reports-grid__trend">
              <CardHeader
                title="Six-month trend"
                description="Cleared income and spending by calendar month."
              />
              <CardBody>
                <div
                  className="trend-chart"
                  role="img"
                  aria-label="Bar chart of income and spending for the last six months. The same values are available in the table below."
                >
                  {trend.map((point) => (
                    <div className="trend-chart__column" key={point.month}>
                      <div className="trend-chart__bars">
                        <span
                          className="trend-chart__bar trend-chart__bar--income"
                          style={{
                            height: `${Math.max(2, Math.round((point.incomeMinor / maxTrend) * 100))}%`,
                          }}
                          title={`${point.label} income ${formatMoney(point.incomeMinor, currency, locale)}`}
                        />
                        <span
                          className="trend-chart__bar trend-chart__bar--expense"
                          style={{
                            height: `${Math.max(2, Math.round((point.expenseMinor / maxTrend) * 100))}%`,
                          }}
                          title={`${point.label} spending ${formatMoney(point.expenseMinor, currency, locale)}`}
                        />
                      </div>
                      <span className="trend-chart__label">{point.label}</span>
                    </div>
                  ))}
                </div>
                <div className="trend-legend" aria-hidden="true">
                  <span className="trend-legend__item trend-legend__item--income">Income</span>
                  <span className="trend-legend__item trend-legend__item--expense">Spending</span>
                </div>
                <Disclosure summary="Show the trend as a table">
                  <div className="table-wrap">
                    <table className="data-table">
                      <caption className="sr-only">
                        Income and spending by month for the last six months
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Month</th>
                          <th scope="col">Income</th>
                          <th scope="col">Spending</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trend.map((point) => (
                          <tr key={point.month}>
                            <th scope="row">{formatMonth(point.month, locale)}</th>
                            <td>{formatMoney(point.incomeMinor, currency, locale)}</td>
                            <td>{formatMoney(point.expenseMinor, currency, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Disclosure>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="What is included"
              description="The same source records and pure functions as the dashboard."
            />
            <CardBody>
              <div className="report-rules">
                <ul className="plain-list">
                  <li>Only cleared transactions count in the month totals.</li>
                  <li>Pending expenses are shown separately, never folded into spending.</li>
                  <li>Bill payments are single expense transactions, not counted twice.</li>
                  <li>
                    Debt payments are expenses; savings contributions are transfers and are not.
                  </li>
                  <li>Expected paydays are not income until you record them as received.</li>
                </ul>
                <ButtonLink to="/help" variant="ghost" size="sm" iconAfter="arrow-right">
                  Read how Tide calculates
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
