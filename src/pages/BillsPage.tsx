import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, Disclosure, EmptyState, InlineNotice } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { SegmentedControl } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { BillCalendar } from '@/components/finance/BillCalendar';
import { BillOccurrenceRow } from '@/components/finance/rows';
import { BillFormDialog } from '@/components/finance/BillFormDialog';
import { useAppData } from '@/state/AppDataProvider';
import type { Bill, BillOccurrence, Category, Transaction } from '@/domain/types';
import { calculateSafeToSpend } from '@/domain/safeToSpend';
import { sortOccurrencesForDisplay } from '@/domain/reports';
import {
  addDays,
  formatDateOnly,
  formatMonth,
  monthKey,
  relativeDayLabel,
  startOfMonth,
  todayISO,
} from '@/lib/dates';
import { formatMoney } from '@/lib/money';

type Tab = 'upcoming' | 'paid' | 'skipped' | 'all';
type View = 'list' | 'calendar';

const EMPTY_BILLS: Bill[] = [];
const EMPTY_OCCURRENCES: BillOccurrence[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_CATEGORIES: Category[] = [];

export function BillsPage() {
  const { snapshot, actions, busy } = useAppData();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [view, setView] = useState<View>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(todayISO()));
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [unpayTarget, setUnpayTarget] = useState<BillOccurrence | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Bill | null>(null);
  const today = todayISO();

  const settings = snapshot?.settings;
  const bills = snapshot?.bills ?? EMPTY_BILLS;
  const occurrences = snapshot?.billOccurrences ?? EMPTY_OCCURRENCES;
  const transactions = snapshot?.transactions ?? EMPTY_TRANSACTIONS;
  const categories = snapshot?.categories ?? EMPTY_CATEGORIES;
  const currency = settings?.currency ?? 'USD';
  const locale = settings?.locale ?? 'en-US';
  const dateFormat = settings?.dateFormat ?? 'medium';

  const breakdown = settings
    ? calculateSafeToSpend({
        settings,
        transactions,
        savingsEntries: snapshot?.savingsEntries ?? [],
        billOccurrences: occurrences,
        bills,
        incomeSources: snapshot?.incomeSources ?? [],
        today,
      })
    : null;

  const activeBills = bills.filter((bill) => bill.active);
  const archivedBills = bills.filter((bill) => !bill.active);
  const billMap = useMemo(() => new Map(bills.map((bill) => [bill.id, bill])), [bills]);
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const upcomingCount = occurrences.filter(
    (occurrence) =>
      occurrence.status === 'unpaid' &&
      (occurrence.dueDate < today || occurrence.dueDate <= addDays(today, 60)),
  ).length;
  const paidCount = occurrences.filter((occurrence) => occurrence.status === 'paid').length;
  const skippedCount = occurrences.filter((occurrence) => occurrence.status === 'skipped').length;

  const horizon = addDays(today, 60);
  let visible: BillOccurrence[];
  if (tab === 'upcoming') {
    visible = sortOccurrencesForDisplay(
      occurrences.filter(
        (occurrence) =>
          occurrence.status === 'unpaid' &&
          (occurrence.dueDate < today || occurrence.dueDate <= horizon),
      ),
    ).slice(0, 80);
  } else if (tab === 'paid') {
    visible = occurrences
      .filter((occurrence) => occurrence.status === 'paid')
      .sort((a, b) => (b.paidAt ?? b.dueDate).localeCompare(a.paidAt ?? a.dueDate))
      .slice(0, 80);
  } else if (tab === 'skipped') {
    visible = occurrences
      .filter((occurrence) => occurrence.status === 'skipped')
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      .slice(0, 80);
  } else {
    visible = occurrences
      .filter(
        (occurrence) =>
          occurrence.dueDate >= addDays(today, -180) && occurrence.dueDate <= addDays(today, 90),
      )
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      .slice(0, 120);
  }

  const overdue = occurrences.filter(
    (occurrence) => occurrence.status === 'unpaid' && occurrence.dueDate < today,
  );
  const overdueTotal = overdue.reduce((total, occurrence) => total + occurrence.amountMinor, 0);
  const paidThisMonth = occurrences
    .filter(
      (occurrence) =>
        occurrence.status === 'paid' &&
        occurrence.paidAt &&
        monthKey(occurrence.paidAt) === monthKey(today),
    )
    .reduce((total, occurrence) => total + occurrence.amountMinor, 0);

  function openNew() {
    setEditingBill(null);
    setFormOpen(true);
  }

  function openEdit(bill: Bill) {
    setEditingBill(bill);
    setFormOpen(true);
  }

  function renderRow(occurrence: BillOccurrence) {
    const bill = billMap.get(occurrence.billId);
    return (
      <BillOccurrenceRow
        key={occurrence.id}
        occurrence={occurrence}
        bill={bill}
        category={bill?.categoryId ? categoryMap.get(bill.categoryId) : undefined}
        currency={currency}
        locale={locale}
        dateFormat={dateFormat}
        today={today}
        busy={busy}
        onMarkPaid={() => void actions.markBillPaid(occurrence.id)}
        onSkip={() => void actions.skipBill(occurrence.id)}
        onMarkUnpaid={() => setUnpayTarget(occurrence)}
        onUnskip={() => void actions.unskipBill(occurrence.id)}
        onEditBill={bill ? () => openEdit(bill) : undefined}
      />
    );
  }

  const emptyCopy: Record<Tab, { title: string; description: string }> = {
    upcoming: {
      title: 'Nothing due in the next 60 days',
      description: 'Add a bill or adjust a schedule. Upcoming unpaid due dates appear here.',
    },
    paid: {
      title: 'No paid bills yet',
      description: 'Mark a bill paid when it leaves your account. The payment history stays here.',
    },
    skipped: {
      title: 'No skipped bills',
      description: 'Skipping is for an occurrence that does not apply this time. It is reversible.',
    },
    all: {
      title: 'No bill occurrences in this range',
      description: 'Add a bill to start a calm, visible schedule.',
    },
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Plan"
        title="Bills"
        description="Unpaid bills are reserved in your plan. Paid and skipped history stays put."
        actions={
          <Button icon="plus" onClick={openNew}>
            Add bill
          </Button>
        }
      />

      {overdue.length > 0 ? (
        <InlineNotice
          tone="warning"
          title={`${overdue.length} past-due ${overdue.length === 1 ? 'bill' : 'bills'}`}
        >
          That happens. Clear what you can, or skip an occurrence that does not apply. Nothing is
          marked paid automatically.
        </InlineNotice>
      ) : null}

      <div className="metric-grid">
        <Card className="metric-card">
          <p className="metric__label">Reserved in this plan</p>
          <p className="metric__value">
            {formatMoney(breakdown?.reservedBillsMinor ?? 0, currency, locale)}
          </p>
          <p className="metric__note">
            {breakdown?.reservedBillCount ?? 0} unpaid{' '}
            {breakdown?.reservedBillCount === 1 ? 'occurrence' : 'occurrences'} through{' '}
            {breakdown ? formatDateOnly(breakdown.planWindow.end, locale, 'short') : 'the window'}.
          </p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Past due</p>
          <p className="metric__value">{formatMoney(overdueTotal, currency, locale)}</p>
          <p className="metric__note">
            {overdue.length === 0 ? 'Nothing overdue.' : `${overdue.length} still unpaid.`}
          </p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Paid this month</p>
          <p className="metric__value">{formatMoney(paidThisMonth, currency, locale)}</p>
          <p className="metric__note">In {formatMonth(today, locale)}.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Active bills</p>
          <p className="metric__value">{activeBills.length}</p>
          <p className="metric__note">
            {activeBills.length === 0
              ? 'Add one to make commitments visible.'
              : `Next: ${relativeDayLabel(
                  sortOccurrencesForDisplay(
                    occurrences.filter(
                      (occurrence) => occurrence.status === 'unpaid' && occurrence.dueDate >= today,
                    ),
                  )[0]?.dueDate ?? today,
                  today,
                  locale,
                )}`}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Due dates"
          description={
            view === 'calendar'
              ? 'Every bill occurrence in the selected month. Use the arrows to look ahead or back.'
              : 'Showing the next 60 days on the upcoming tab. Paid and skipped tabs keep history.'
          }
          action={
            <Badge tone="neutral" icon="info">
              One payment = one expense
            </Badge>
          }
        />
        <CardBody>
          <div className={`filter-row${view === 'list' ? ' filter-row--split' : ''}`}>
            {view === 'list' ? (
              <SegmentedControl
                label="Bill occurrence filter"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'upcoming', label: `Upcoming (${upcomingCount})` },
                  { value: 'paid', label: `Paid (${paidCount})` },
                  { value: 'skipped', label: `Skipped (${skippedCount})` },
                  { value: 'all', label: 'All' },
                ]}
              />
            ) : null}
            <SegmentedControl
              label="Due date view"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'List' },
                { value: 'calendar', label: 'Calendar' },
              ]}
            />
          </div>
          {view === 'calendar' ? (
            <BillCalendar
              month={calendarMonth}
              occurrences={occurrences}
              bills={bills}
              currency={currency}
              locale={locale}
              today={today}
              onMonthChange={setCalendarMonth}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon="receipt"
              title={emptyCopy[tab].title}
              description={emptyCopy[tab].description}
              action={
                <Button size="sm" variant="secondary" icon="plus" onClick={openNew}>
                  Add bill
                </Button>
              }
            />
          ) : (
            <ul className="row-list">{visible.map(renderRow)}</ul>
          )}
        </CardBody>
      </Card>

      {archivedBills.length > 0 ? (
        <Card>
          <CardHeader
            title="Archived bills"
            description="They no longer reserve future money. Paid and skipped history is kept."
          />
          <CardBody>
            <ul className="source-list">
              {archivedBills.map((bill) => (
                <li className="source-card" key={bill.id}>
                  <div className="source-card__top">
                    <div>
                      <div className="source-card__title-line">
                        <h3>{bill.name}</h3>
                        <Badge tone="neutral">Archived</Badge>
                      </div>
                      <p className="source-card__meta">
                        {formatMoney(bill.amountMinor, currency, locale)} · {bill.frequency}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void actions.restoreBill(bill.id)}
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

      <Card>
        <CardHeader title="How bills and spending stay in sync" />
        <CardBody>
          <Disclosure summary="Show the rules Harbor follows">
            <ul className="plain-list">
              <li>
                An unpaid occurrence is reserved in safe to spend until its due date leaves the
                planning window.
              </li>
              <li>
                Marking paid creates exactly one expense transaction and links it to that
                occurrence.
              </li>
              <li>
                Marking unpaid removes that one transaction and reserves the occurrence again.
              </li>
              <li>
                A paid occurrence cannot be edited into a different amount from the bill payment
                screen; unpay it first.
              </li>
              <li>
                Editing a bill updates future unpaid occurrences from today onward. Paid and skipped
                history is untouched.
              </li>
              <li>
                Archiving a bill removes future unpaid occurrences so they stop reserving money.
              </li>
              <li>
                Monthly dates clamp to the last valid day. February 31 becomes February 28 or 29.
              </li>
            </ul>
          </Disclosure>
        </CardBody>
      </Card>

      <BillFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        bill={editingBill}
        onArchive={(bill) => setArchiveTarget(bill)}
      />

      <ConfirmDialog
        open={unpayTarget !== null}
        onClose={() => setUnpayTarget(null)}
        onConfirm={() => {
          if (unpayTarget) {
            void actions
              .markBillUnpaid(unpayTarget.id)
              .then(() => setUnpayTarget(null))
              .catch(() => undefined);
          }
        }}
        title="Mark this bill unpaid?"
        description="This removes the linked payment transaction so the bill and your spending stay in sync. The bill will be reserved again."
        confirmLabel="Mark unpaid"
        busy={busy}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) {
            void actions
              .archiveBill(archiveTarget.id)
              .then(() => setArchiveTarget(null))
              .catch(() => undefined);
          }
        }}
        title={archiveTarget ? `Archive ${archiveTarget.name}?` : 'Archive this bill?'}
        description="Future unpaid due dates will stop reserving money. Paid and skipped history, and past unpaid records, stay in place. You can restore it later."
        confirmLabel="Archive bill"
        busy={busy}
      />
    </div>
  );
}
