import type {
  Bill,
  BillOccurrence,
  Category,
  DateOnly,
  PlannedPayday,
  Transaction,
} from '@/domain/types';
import { Badge, type StatusTone } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { formatDateOnly, dueTone, relativeDayLabel, daysBetween, isWeekend } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

export function CategoryDot({ category }: { category?: Category }) {
  return (
    <span className={`category-dot category-dot--${category?.color ?? 'stone'}`} aria-hidden="true">
      <Icon name={(category?.icon as IconName) ?? 'dot'} size={16} />
    </span>
  );
}

export function TransactionRow({
  transaction,
  category,
  currency,
  locale,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  category?: Category;
  currency: string;
  locale: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isIncome = transaction.type === 'income';
  return (
    <li className="transaction-row">
      <CategoryDot category={category} />
      <div className="transaction-row__main">
        <p className="transaction-row__description">{transaction.description}</p>
        <p className="transaction-row__meta">
          <span>{category?.name ?? 'Uncategorised'}</span>
          {transaction.status === 'pending' ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Pending</span>
            </>
          ) : null}
          {transaction.billId ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Bill payment</span>
            </>
          ) : null}
          {transaction.debtId ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Debt payment</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="transaction-row__side">
        <span
          className={[
            'transaction-row__amount',
            isIncome ? 'transaction-row__amount--income' : 'transaction-row__amount--expense',
            transaction.status === 'pending' ? 'is-pending' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isIncome ? '+' : '−'}
          {formatMoney(transaction.amountMinor, currency, locale)}
        </span>
        {onEdit || onDelete ? (
          <div className="transaction-row__actions">
            {onEdit ? (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon="edit"
                onClick={onEdit}
                aria-label={`Edit ${transaction.description}`}
              />
            ) : null}
            {onDelete ? (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon="trash"
                onClick={onDelete}
                aria-label={`Delete ${transaction.description}`}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function occurrenceStatus(
  occurrence: BillOccurrence,
  today: DateOnly,
): {
  label: string;
  tone: StatusTone;
} {
  if (occurrence.status === 'paid') return { label: 'Paid', tone: 'positive' };
  if (occurrence.status === 'skipped') return { label: 'Skipped', tone: 'neutral' };
  const tone = dueTone(occurrence.dueDate, today);
  if (tone === 'overdue') {
    return {
      label: `Overdue by ${Math.abs(daysBetween(today, occurrence.dueDate))}d`,
      tone: 'warning',
    };
  }
  if (tone === 'today') return { label: 'Due today', tone: 'accent' };
  if (tone === 'soon') return { label: relativeDayLabel(occurrence.dueDate, today), tone: 'info' };
  return { label: relativeDayLabel(occurrence.dueDate, today), tone: 'neutral' };
}

export function BillOccurrenceRow({
  occurrence,
  bill,
  category,
  currency,
  locale,
  dateFormat,
  today,
  onMarkPaid,
  onMarkUnpaid,
  onSkip,
  onUnskip,
  onEditBill,
  busy,
}: {
  occurrence: BillOccurrence;
  bill?: Bill;
  category?: Category;
  currency: string;
  locale: string;
  dateFormat: 'short' | 'medium' | 'long';
  today: DateOnly;
  onMarkPaid?: () => void;
  onMarkUnpaid?: () => void;
  onSkip?: () => void;
  onUnskip?: () => void;
  onEditBill?: () => void;
  busy?: boolean;
}) {
  const status = occurrenceStatus(occurrence, today);
  return (
    <li className={`bill-row bill-row--${occurrence.status}`}>
      <div className="bill-row__date" aria-hidden="true">
        <span>
          {formatDateOnly(occurrence.dueDate, locale, 'short').replace(/\/\d{4}|\/\d{2}$/, '')}
        </span>
        <span>{relativeDayLabel(occurrence.dueDate, today, locale)}</span>
      </div>
      <div className="bill-row__main">
        <div className="bill-row__title-line">
          <span className="bill-row__name">{bill?.name ?? 'Bill'}</span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="bill-row__meta">
          <span>{category?.name ?? 'Uncategorised'}</span>
          <span aria-hidden="true">·</span>
          <span>Due {formatDateOnly(occurrence.dueDate, locale, dateFormat)}</span>
          {occurrence.status === 'unpaid' && isWeekend(occurrence.dueDate) ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="bill-row__weekend">Weekend due date</span>
            </>
          ) : null}
          {bill?.autoPay ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Autopay reminder</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="bill-row__side">
        <span className="bill-row__amount">
          {formatMoney(occurrence.amountMinor, currency, locale)}
        </span>
        <div className="bill-row__actions">
          {occurrence.status === 'unpaid' && onMarkPaid ? (
            <Button size="sm" variant="secondary" icon="check" onClick={onMarkPaid} disabled={busy}>
              Paid
            </Button>
          ) : null}
          {occurrence.status === 'unpaid' && onSkip ? (
            <Button size="sm" variant="ghost" onClick={onSkip} disabled={busy}>
              Skip
            </Button>
          ) : null}
          {occurrence.status === 'paid' && onMarkUnpaid ? (
            <Button size="sm" variant="ghost" onClick={onMarkUnpaid} disabled={busy}>
              Mark unpaid
            </Button>
          ) : null}
          {occurrence.status === 'skipped' && onUnskip ? (
            <Button size="sm" variant="ghost" onClick={onUnskip} disabled={busy}>
              Restore
            </Button>
          ) : null}
          {onEditBill ? (
            <Button
              size="sm"
              variant="ghost"
              iconOnly
              icon="edit"
              onClick={onEditBill}
              aria-label={`Edit ${bill?.name ?? 'bill'}`}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function PaydayRow({
  payday,
  currency,
  locale,
  dateFormat,
  onReceive,
  busy,
}: {
  payday: PlannedPayday;
  currency: string;
  locale: string;
  dateFormat: 'short' | 'medium' | 'long';
  onReceive?: () => void;
  busy?: boolean;
}) {
  return (
    <li className="payday-row">
      <div className="payday-row__icon" aria-hidden="true">
        <Icon name="calendar-check" size={18} />
      </div>
      <div className="payday-row__main">
        <p className="payday-row__date">{formatDateOnly(payday.date, locale, dateFormat)}</p>
        <p className="payday-row__sources">
          {payday.entries.map((entry) => entry.sourceName).join(' · ')}
        </p>
      </div>
      <span className="payday-row__amount">{formatMoney(payday.totalMinor, currency, locale)}</span>
      {onReceive ? (
        <Button size="sm" variant="secondary" onClick={onReceive} disabled={busy}>
          Received
        </Button>
      ) : null}
    </li>
  );
}
