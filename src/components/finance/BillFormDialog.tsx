import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import {
  Checkbox,
  Field,
  FormErrorSummary,
  MoneyInput,
  Select,
  TextInput,
  Textarea,
} from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { useAppData } from '@/state/AppDataProvider';
import type { Bill } from '@/domain/types';
import { billFormSchema } from '@/domain/schemas';
import {
  currencyFractionDigits,
  currencySymbol,
  minorToInput,
  parseMoneyToMinor,
} from '@/lib/money';
import { todayISO } from '@/lib/dates';

const FREQUENCIES: Array<{ value: Bill['frequency']; label: string }> = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Every month' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Every year' },
  { value: 'one-time', label: 'One time' },
];

export function BillFormDialog({
  open,
  onClose,
  bill,
  onArchive,
}: {
  open: boolean;
  onClose: () => void;
  bill: Bill | null;
  onArchive?: (bill: Bill) => void;
}) {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const currency = snapshot?.settings.currency ?? 'USD';
  const locale = snapshot?.settings.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const expenseCategories = (snapshot?.categories ?? []).filter(
    (category) => !category.archived && category.kind === 'expense',
  );
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Bill['frequency']>('monthly');
  const [anchorDate, setAnchorDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [secondDay, setSecondDay] = useState('15');
  const [categoryId, setCategoryId] = useState('cat-bills');
  const [accountId, setAccountId] = useState('');
  const [autoPay, setAutoPay] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(bill?.name ?? '');
    setAmount(bill ? minorToInput(bill.amountMinor, currency) : '');
    setFrequency(bill?.frequency ?? 'monthly');
    setAnchorDate(bill?.anchorDate ?? todayISO());
    setEndDate(bill?.endDate ?? '');
    setSecondDay(String(bill?.secondDay ?? 15));
    setCategoryId(bill?.categoryId ?? 'cat-bills');
    setAccountId(
      bill?.accountId ?? snapshot?.accounts.find((account) => !account.archived)?.id ?? '',
    );
    setAutoPay(bill?.autoPay ?? false);
    setNotes(bill?.notes ?? '');
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [open, bill, currency, snapshot?.accounts]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = billFormSchema.safeParse({
      name,
      amount,
      frequency,
      anchorDate,
      endDate,
      secondDay,
      categoryId: categoryId || null,
      accountId: accountId || null,
      autoPay,
      notes,
    });
    const nextErrors: Record<string, string> = {};
    const summaries: string[] = [];
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? 'form');
        if (!nextErrors[field]) nextErrors[field] = issue.message;
        summaries.push(issue.message);
      }
    }
    const amountMinor = parseMoneyToMinor(amount, currency);
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amount = `Enter an amount greater than zero, with up to ${currencyFractionDigits(currency)} decimal places.`;
      summaries.push(nextErrors.amount);
    }
    const secondDayNumber = secondDay.trim() === '' ? null : Number(secondDay);
    if (
      frequency === 'semimonthly' &&
      (secondDayNumber === null ||
        !Number.isInteger(secondDayNumber) ||
        secondDayNumber < 2 ||
        secondDayNumber > 31)
    ) {
      nextErrors.secondDay = 'Choose a day between 2 and 31.';
      summaries.push(nextErrors.secondDay);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0 || amountMinor === null) return;

    setSubmitting(true);
    try {
      const input = {
        name,
        amountMinor,
        frequency,
        anchorDate,
        endDate: endDate || null,
        secondDay: frequency === 'semimonthly' ? secondDayNumber : null,
        categoryId: categoryId || null,
        accountId: accountId || null,
        autoPay,
        notes,
      };
      if (bill) await actions.updateBill(bill.id, input);
      else await actions.createBill(input);
      onClose();
    } catch {
      // Provider toast keeps the form intact.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={bill ? 'Edit bill' : 'Add a bill'}
      description="Harbor reserves unpaid bills in your plan until you mark them paid or skip them."
      footer={
        <>
          {bill && onArchive ? (
            <Button
              variant="danger"
              onClick={() => {
                onClose();
                onArchive(bill);
              }}
              className="dialog__footer-start"
            >
              Archive bill
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            {bill ? 'Save changes' : 'Add bill'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        {bill ? (
          <InlineNotice tone="info" title="Changing a recurring bill">
            Paid and skipped history stays exactly as it is. Unpaid due dates from today onward are
            rebuilt with the new amount and schedule.
          </InlineNotice>
        ) : null}
        <FormErrorSummary errors={formErrors} />
        <Field label="Bill name" htmlFor={`${baseId}-name`} error={errors.name} required>
          <TextInput
            id={`${baseId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Rent, phone, insurance…"
            maxLength={60}
            invalid={Boolean(errors.name)}
            autoFocus
            aria-describedby={errors.name ? `${baseId}-name-error` : undefined}
          />
        </Field>
        <div className="form-grid form-grid--2">
          <Field label="Amount" htmlFor={`${baseId}-amount`} error={errors.amount} required>
            <MoneyInput
              id={`${baseId}-amount`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? `${baseId}-amount-error` : undefined}
            />
          </Field>
          <Field label="How often" htmlFor={`${baseId}-frequency`}>
            <Select
              id={`${baseId}-frequency`}
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as Bill['frequency'])}
            >
              {FREQUENCIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="form-grid form-grid--2">
          <Field
            label={frequency === 'one-time' ? 'Due date' : 'First due date'}
            htmlFor={`${baseId}-anchor`}
            error={errors.anchorDate}
            hint={
              frequency === 'monthly'
                ? 'Harbor clamps to the last day of shorter months.'
                : undefined
            }
            required
          >
            <TextInput
              id={`${baseId}-anchor`}
              type="date"
              value={anchorDate}
              onChange={(event) => setAnchorDate(event.target.value)}
              invalid={Boolean(errors.anchorDate)}
            />
          </Field>
          <Field label="Stop after (optional)" htmlFor={`${baseId}-end`} error={errors.endDate}>
            <TextInput
              id={`${baseId}-end`}
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              invalid={Boolean(errors.endDate)}
              disabled={frequency === 'one-time'}
            />
          </Field>
        </div>
        {frequency === 'semimonthly' ? (
          <Field
            label="Second due day"
            htmlFor={`${baseId}-second-day`}
            error={errors.secondDay}
            hint="The first due day is always the 1st. Shorter months use their last day."
          >
            <TextInput
              id={`${baseId}-second-day`}
              type="number"
              min={2}
              max={31}
              value={secondDay}
              onChange={(event) => setSecondDay(event.target.value)}
              invalid={Boolean(errors.secondDay)}
            />
          </Field>
        ) : null}
        <Field label="Category" htmlFor={`${baseId}-category`}>
          <Select
            id={`${baseId}-category`}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Uncategorised</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Checkbox
          label="Autopay is on"
          description="Just a reminder. Harbor never moves money or charges anything."
          checked={autoPay}
          onChange={(event) => setAutoPay(event.target.checked)}
        />
        {(snapshot?.accounts.length ?? 0) > 1 ? (
          <Field label="Account" htmlFor={`${baseId}-account`} hint="Where this bill is paid from.">
            <Select
              id={`${baseId}-account`}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {(snapshot?.accounts ?? [])
                .filter((account) => !account.archived || account.id === accountId)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Note (optional)" htmlFor={`${baseId}-notes`}>
          <Textarea
            id={`${baseId}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={500}
          />
        </Field>
      </form>
    </Dialog>
  );
}
