import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Badge, EmptyState, InlineNotice, ProgressBar } from '@/components/ui/Feedback';
import { SegmentedControl, Select, TextInput } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { TransactionRow } from '@/components/finance/rows';
import { TransactionFormDialog } from '@/components/finance/TransactionFormDialog';
import { EnvelopeFormDialog } from '@/components/finance/EnvelopeFormDialog';
import { useAppData } from '@/state/AppDataProvider';
import { useToast } from '@/components/ui/ToastProvider';
import type { Category, Envelope, Transaction, TransactionStatus } from '@/domain/types';
import { envelopeProgressList } from '@/domain/envelopes';
import { formatDateOnly, formatMonth, monthKey, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

type TypeFilter = 'all' | 'expense' | 'income';
type StatusFilter = 'all' | TransactionStatus;

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_ENVELOPES: Envelope[] = [];

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Everything' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'pending', label: 'Pending' },
];

export function SpendingPage() {
  const { snapshot, actions, busy, openQuickAdd } = useAppData();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const today = todayISO();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    searchParams.get('status') === 'pending' ? 'pending' : 'all',
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [envelopeFormOpen, setEnvelopeFormOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [archiveEnvelopeTarget, setArchiveEnvelopeTarget] = useState<Envelope | null>(null);

  const settings = snapshot?.settings;
  const currency = settings?.currency ?? 'USD';
  const locale = settings?.locale ?? 'en-US';
  const dateFormat = settings?.dateFormat ?? 'medium';
  const transactions = snapshot?.transactions ?? EMPTY_TRANSACTIONS;
  const categories = snapshot?.categories ?? EMPTY_CATEGORIES;
  const envelopes = snapshot?.envelopes ?? EMPTY_ENVELOPES;

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const envelopeRows = useMemo(
    () => envelopeProgressList(envelopes, transactions, today),
    [envelopes, transactions, today],
  );

  const stats = useMemo(() => {
    let spending = 0;
    let income = 0;
    let pending = 0;
    const thisMonth = monthKey(today);
    for (const transaction of transactions) {
      if (transaction.type === 'expense' && transaction.status === 'pending') {
        pending += transaction.amountMinor;
      }
      if (transaction.status !== 'cleared' || monthKey(transaction.date) !== thisMonth) continue;
      if (transaction.type === 'income') income += transaction.amountMinor;
      else spending += transaction.amountMinor;
    }
    return { spending, income, pending };
  }, [transactions, today]);

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return transactions
      .filter((transaction) => {
        if (typeFilter !== 'all' && transaction.type !== typeFilter) return false;
        if (statusFilter !== 'all' && transaction.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && (transaction.categoryId ?? 'none') !== categoryFilter) {
          return false;
        }
        if (!needle) return true;
        const categoryName = transaction.categoryId
          ? (categoryMap.get(transaction.categoryId)?.name ?? '')
          : '';
        return `${transaction.description} ${transaction.notes} ${categoryName}`
          .toLocaleLowerCase()
          .includes(needle);
      })
      .slice(0, 300);
  }, [transactions, typeFilter, statusFilter, categoryFilter, search, categoryMap]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const transaction of visible) {
      const list = map.get(transaction.date) ?? [];
      list.push(transaction);
      map.set(transaction.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [visible]);

  const filtersActive =
    search.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setFormOpen(true);
  }

  function openEnvelopeNew() {
    setEditingEnvelope(null);
    setEnvelopeFormOpen(true);
  }

  function openEnvelopeEdit(envelope: Envelope) {
    setEditingEnvelope(envelope);
    setEnvelopeFormOpen(true);
  }

  async function removeTransaction() {
    if (!deleteTarget) return;
    try {
      const removed = await actions.deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      toast({
        tone: 'info',
        title: 'Transaction removed',
        message: 'It no longer affects your totals. You can put it back if that was a slip.',
        action: {
          label: 'Undo',
          onClick: () => {
            void actions.restoreTransaction(removed).catch(() => undefined);
          },
        },
        duration: 9000,
      });
    } catch {
      // The provider shows a user-safe error and keeps the list unchanged.
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Track"
        title="Spending"
        description="Every expense and received income in one calm list. Search when you need to; ignore it when you do not."
        actions={
          <>
            <Button icon="plus" onClick={() => openQuickAdd({ type: 'expense', date: today })}>
              Add expense
            </Button>
            <Button variant="secondary" onClick={openNew}>
              Full form
            </Button>
          </>
        }
      />

      {stats.pending > 0 ? (
        <InlineNotice tone="warning" title="Pending spending is separate">
          {formatMoney(stats.pending, currency, locale)} is still pending, so it is not counted in
          cash on hand. Clear an entry when the payment settles.
        </InlineNotice>
      ) : null}

      <div className="metric-grid">
        <Card className="metric-card">
          <p className="metric__label">Spent this month</p>
          <p className="metric__value">{formatMoney(stats.spending, currency, locale)}</p>
          <p className="metric__note">Cleared expenses in {formatMonth(today, locale)}.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Received this month</p>
          <p className="metric__value">{formatMoney(stats.income, currency, locale)}</p>
          <p className="metric__note">Cleared income only. Projections stay separate.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Pending</p>
          <p className="metric__value">{formatMoney(stats.pending, currency, locale)}</p>
          <p className="metric__note">Not yet taken out of spendable cash.</p>
        </Card>
        <Card className="metric-card">
          <p className="metric__label">Records shown</p>
          <p className="metric__value">{visible.length}</p>
          <p className="metric__note">
            {filtersActive ? 'Matching your filters.' : 'Most recent first.'}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          eyebrow="Envelopes"
          title="Monthly category limits"
          description="Envelopes compare cleared spending with a monthly amount. They guide choices without reserving cash or changing safe to spend."
          action={
            <Button variant="secondary" size="sm" icon="plus" onClick={openEnvelopeNew}>
              Add envelope
            </Button>
          }
        />
        <CardBody>
          {envelopeRows.length === 0 ? (
            <EmptyState
              icon="target"
              title="No envelopes yet"
              description="Set a monthly amount for a category you want to keep an eye on, like groceries or eating out."
              action={
                <Button variant="secondary" size="sm" icon="plus" onClick={openEnvelopeNew}>
                  Add envelope
                </Button>
              }
            />
          ) : (
            <div className="envelope-grid">
              {envelopeRows.map((row) => {
                const fundedMinor = row.envelope.monthlyAmountMinor * row.monthsTracked;
                const usedPercent =
                  fundedMinor > 0
                    ? Math.min(
                        100,
                        Math.max(0, ((fundedMinor - row.availableMinor) / fundedMinor) * 100),
                      )
                    : 0;
                return (
                  <div className="envelope-card" key={row.envelope.id}>
                    <div className="envelope-card__top">
                      <div>
                        <div className="source-card__title-line">
                          <h3>{row.envelope.name}</h3>
                          {row.envelope.sample ? <Badge tone="info">Sample</Badge> : null}
                        </div>
                        <p className="source-card__meta">
                          {categoryMap.get(row.envelope.categoryId)?.name ?? 'Removed category'} ·{' '}
                          {row.envelope.rollover ? 'Rolls over' : 'This month only'}
                        </p>
                      </div>
                      <div className="inline-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon="edit"
                          aria-label={`Edit ${row.envelope.name} envelope`}
                          onClick={() => openEnvelopeEdit(row.envelope)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon="trash"
                          aria-label={`Archive ${row.envelope.name} envelope`}
                          onClick={() => setArchiveEnvelopeTarget(row.envelope)}
                        />
                      </div>
                    </div>
                    <div className="envelope-card__amounts">
                      <span>
                        <strong>
                          {formatMoney(Math.max(0, row.availableMinor), currency, locale)}
                        </strong>{' '}
                        {row.overspent ? 'over' : 'left'}
                      </span>
                      <span>
                        {formatMoney(row.spentThisMonthMinor, currency, locale)} spent this month
                      </span>
                    </div>
                    <ProgressBar
                      label={`${row.envelope.name} envelope used`}
                      value={usedPercent}
                      tone={row.overspent ? 'apricot' : 'sky'}
                      size="sm"
                    />
                    {row.envelope.rollover && row.monthsTracked > 1 ? (
                      <p className="disclosure-note">
                        Includes {row.monthsTracked} months since {row.envelope.startMonth}.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Transaction list"
          description="Bill and debt payments are linked records. Harbor keeps them in sync with their source."
          action={
            <ButtonLink to="/reports" variant="ghost" size="sm">
              See reports
            </ButtonLink>
          }
        />
        <CardBody>
          <div className="filter-panel">
            <label className="filter-control filter-control--search">
              <span>Search</span>
              <TextInput
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Description, note, category…"
                aria-label="Search transactions"
              />
            </label>
            <div className="filter-control">
              <span>Type</span>
              <SegmentedControl
                label="Transaction type filter"
                value={typeFilter}
                onChange={setTypeFilter}
                options={TYPE_OPTIONS}
              />
            </div>
            <label className="filter-control">
              <span>Status</span>
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                aria-label="Filter by status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="filter-control">
              <span>Category</span>
              <Select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                <option value="none">Uncategorised</option>
                {categories
                  .filter((category) => !category.archived)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </Select>
            </label>
            {filtersActive ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>

          {groups.length === 0 ? (
            <EmptyState
              icon="wallet"
              title={
                transactions.length === 0 ? 'No transactions yet' : 'Nothing matches those filters'
              }
              description={
                transactions.length === 0
                  ? 'Add an expense as it happens. One small entry is enough to keep the picture honest.'
                  : 'Try a different search or clear the filters. Your records have not changed.'
              }
              action={
                transactions.length === 0 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="plus"
                    onClick={() => openQuickAdd({ type: 'expense', date: today })}
                  >
                    Add expense
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <div className="date-groups">
              {groups.map(([date, rows]) => (
                <section
                  className="date-group"
                  key={date}
                  aria-label={formatDateOnly(date, locale, 'long')}
                >
                  <div className="date-group__header">
                    <h3>{formatDateOnly(date, locale, dateFormat)}</h3>
                    <span>
                      {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <ul className="row-list">
                    {rows.map((transaction) => (
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
                        onEdit={() => openEdit(transaction)}
                        onDelete={
                          transaction.billOccurrenceId
                            ? undefined
                            : () => setDeleteTarget(transaction)
                        }
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="A small note about editing" />
        <CardBody>
          <ul className="plain-list">
            <li>Editing changes one record and updates every total immediately.</li>
            <li>
              Bill payments cannot be deleted or have their amount changed here. Mark the bill
              unpaid on the Bills page first, so the bill and your spending never disagree.
            </li>
            <li>
              A deleted transaction can be restored with Undo while the message is visible. After
              that, restore a backup if you need it back.
            </li>
          </ul>
        </CardBody>
      </Card>

      <TransactionFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        transaction={editing}
      />

      <EnvelopeFormDialog
        open={envelopeFormOpen}
        onClose={() => {
          setEnvelopeFormOpen(false);
          setEditingEnvelope(null);
        }}
        envelope={editingEnvelope}
      />

      <ConfirmDialog
        open={archiveEnvelopeTarget !== null}
        onClose={() => setArchiveEnvelopeTarget(null)}
        onConfirm={() => {
          if (archiveEnvelopeTarget) {
            void actions
              .archiveEnvelope(archiveEnvelopeTarget.id)
              .then(() => setArchiveEnvelopeTarget(null))
              .catch(() => undefined);
          }
        }}
        title={
          archiveEnvelopeTarget
            ? `Archive ${archiveEnvelopeTarget.name}?`
            : 'Archive this envelope?'
        }
        description="Its history stays with your transactions. You can restore the envelope later."
        confirmLabel="Archive envelope"
        busy={busy}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void removeTransaction()}
        title="Delete this transaction?"
        description={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.description}</strong> for{' '}
              {formatMoney(deleteTarget.amountMinor, currency, locale)} will be removed. You will
              get a short chance to undo.
            </>
          ) : (
            'This transaction will be removed.'
          )
        }
        confirmLabel="Delete transaction"
        busy={busy}
      />
    </div>
  );
}
