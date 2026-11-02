import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, FormErrorSummary, MoneyInput, TextInput, Textarea } from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { useAppData } from '@/state/AppDataProvider';
import type { Debt } from '@/domain/types';
import {
  currencyFractionDigits,
  currencySymbol,
  formatMoney,
  minorToInput,
  parseMoneyToMinor,
} from '@/lib/money';
import { todayISO } from '@/lib/dates';

export function DebtPaymentDialog({
  open,
  onClose,
  debt,
  currentBalanceMinor,
}: {
  open: boolean;
  onClose: () => void;
  debt: Debt | null;
  currentBalanceMinor: number;
}) {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const currency = snapshot?.settings.currency ?? 'USD';
  const locale = snapshot?.settings.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(
      debt && debt.minimumPaymentMinor ? minorToInput(debt.minimumPaymentMinor, currency) : '',
    );
    setDate(todayISO());
    setNote('');
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [open, debt, currency]);

  const amountMinor = parseMoneyToMinor(amount, currency);
  const overpay = amountMinor !== null && amountMinor > currentBalanceMinor;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const summaries: string[] = [];
    if (!date) {
      nextErrors.date = 'Choose a payment date.';
      summaries.push(nextErrors.date);
    }
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amount = `Enter a payment greater than zero, with up to ${currencyFractionDigits(currency)} decimal places.`;
      summaries.push(nextErrors.amount);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0 || amountMinor === null || !debt) return;
    setSubmitting(true);
    try {
      await actions.recordDebtPayment(debt.id, amountMinor, date, note);
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
      title={debt ? `Record a payment — ${debt.name}` : 'Record a payment'}
      description="This creates one expense and reduces the debt balance. Nothing is charged automatically."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            Record payment
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        <div className="payment-context">
          <span>Current balance</span>
          <strong>{formatMoney(currentBalanceMinor, currency, locale)}</strong>
        </div>
        <FormErrorSummary errors={formErrors} />
        <div className="form-grid form-grid--2">
          <Field label="Payment amount" htmlFor={`${baseId}-amount`} error={errors.amount} required>
            <MoneyInput
              id={`${baseId}-amount`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.amount)}
              autoFocus
              aria-describedby={errors.amount ? `${baseId}-amount-error` : undefined}
            />
          </Field>
          <Field label="Payment date" htmlFor={`${baseId}-date`} error={errors.date} required>
            <TextInput
              id={`${baseId}-date`}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? `${baseId}-date-error` : undefined}
            />
          </Field>
        </div>
        {overpay ? (
          <InlineNotice tone="warning" title="This is more than the balance">
            Tide will show a credit balance instead of hiding the overpayment. Check the amount if
            that is not what you intended.
          </InlineNotice>
        ) : null}
        <Field label="Note (optional)" htmlFor={`${baseId}-note`}>
          <Textarea
            id={`${baseId}-note`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Extra payment, minimum, transfer reference…"
          />
        </Field>
      </form>
    </Dialog>
  );
}
