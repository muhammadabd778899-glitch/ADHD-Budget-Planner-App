import type { Bill, BillOccurrence, DateOnly } from '@/domain/types';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import {
  addDays,
  addMonthsClamped,
  endOfMonth,
  formatMonth,
  monthKey,
  startOfMonth,
} from '@/lib/dates';
import { formatMoneyShort } from '@/lib/money';

const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, 7 + index)),
  ),
);

function weekdayLabels(locale: string): string[] {
  try {
    return Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
        new Date(Date.UTC(2024, 0, 7 + index)),
      ),
    );
  } catch {
    return WEEKDAYS;
  }
}

function dueClass(occurrence: BillOccurrence, today: DateOnly): string {
  if (occurrence.status === 'paid') return 'bill-calendar__event--paid';
  if (occurrence.status === 'skipped') return 'bill-calendar__event--paid';
  if (occurrence.dueDate < today) return 'bill-calendar__event--overdue';
  return '';
}

export function BillCalendar({
  month,
  occurrences,
  bills,
  currency,
  locale,
  today,
  onMonthChange,
}: {
  month: DateOnly;
  occurrences: BillOccurrence[];
  bills: Bill[];
  currency: string;
  locale: string;
  today: DateOnly;
  onMonthChange: (month: DateOnly) => void;
}) {
  const billMap = new Map(bills.map((bill) => [bill.id, bill]));
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const leading = new Date(first).getUTCDay();
  const totalCells = Math.ceil((leading + Number(last.slice(8, 10))) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, index) => addDays(first, index - leading));
  const labels = weekdayLabels(locale);
  const monthKeyValue = monthKey(month);

  const byDay = new Map<DateOnly, BillOccurrence[]>();
  for (const occurrence of occurrences) {
    if (monthKey(occurrence.dueDate) !== monthKeyValue) continue;
    const rows = byDay.get(occurrence.dueDate) ?? [];
    rows.push(occurrence);
    byDay.set(occurrence.dueDate, rows);
  }

  return (
    <div
      className="bill-calendar"
      role="grid"
      aria-label={`Bills for ${formatMonth(month, locale)}`}
    >
      <div className="calendar-toolbar">
        <p className="calendar-toolbar__month">{formatMonth(month, locale)}</p>
        <div className="calendar-toolbar__actions">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon="chevron-right"
            aria-label="Previous month"
            className="calendar-toolbar__prev"
            onClick={() => onMonthChange(addMonthsClamped(month, -1))}
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon="chevron-right"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonthsClamped(month, 1))}
          />
          <Button variant="secondary" size="sm" onClick={() => onMonthChange(startOfMonth(today))}>
            This month
          </Button>
        </div>
      </div>

      <div className="bill-calendar__dow" role="row">
        {labels.map((label) => (
          <span key={label} role="columnheader">
            {label}
          </span>
        ))}
      </div>

      <div className="bill-calendar__grid" role="rowgroup">
        {cells.map((cell) => {
          const dayOccurrences = (byDay.get(cell) ?? []).slice().sort((a, b) => {
            const aName = billMap.get(a.billId)?.name ?? '';
            const bName = billMap.get(b.billId)?.name ?? '';
            return aName.localeCompare(bName);
          });
          const outside = monthKey(cell) !== monthKeyValue;
          const isToday = cell === today;
          const hasOverdue = dayOccurrences.some(
            (occurrence) => occurrence.status === 'unpaid' && occurrence.dueDate < today,
          );
          const description = dayOccurrences.length
            ? dayOccurrences
                .map((occurrence) => {
                  const name = billMap.get(occurrence.billId)?.name ?? 'Bill';
                  return `${name} ${formatMoneyShort(occurrence.amountMinor, currency, locale)}`;
                })
                .join(', ')
            : 'No bills';

          return (
            <div
              key={cell}
              role="gridcell"
              className={[
                'bill-calendar__day',
                outside ? 'bill-calendar__day--outside' : '',
                isToday ? 'bill-calendar__day--today' : '',
                hasOverdue ? 'bill-calendar__day--overdue' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${cell}: ${description}`}
            >
              <span className="bill-calendar__number">{Number(cell.slice(8, 10))}</span>
              {dayOccurrences.slice(0, 2).map((occurrence) => (
                <span
                  key={occurrence.id}
                  className={`bill-calendar__event ${dueClass(occurrence, today)}`}
                  title={`${billMap.get(occurrence.billId)?.name ?? 'Bill'} · ${formatMoneyShort(occurrence.amountMinor, currency, locale)}${occurrence.status === 'paid' ? ' · Paid' : occurrence.status === 'skipped' ? ' · Skipped' : ''}`}
                >
                  {billMap.get(occurrence.billId)?.name ?? 'Bill'}
                </span>
              ))}
              {dayOccurrences.length > 2 ? (
                <span className="bill-calendar__more">+{dayOccurrences.length - 2} more</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="disclosure-note">
        <Icon name="info" size={13} /> Paid and skipped dates stay visible. Overdue unpaid bills are
        outlined in red.
      </p>
    </div>
  );
}
