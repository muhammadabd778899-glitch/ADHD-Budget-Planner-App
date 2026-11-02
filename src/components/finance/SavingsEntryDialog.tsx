import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import {
  Field,
  FormErrorSummary,
  MoneyInput,
  SegmentedControl,
  TextInput,
  Textarea,
} from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { useAppData } from '@/state/AppDataProvider';
import type { SavingsGoal } from '@/domain/types';
import {
  currencyFractionDigits,
  currencySymbol,
  formatMoney,
  parseMoneyToMinor,
} from '@/lib/money';
import { todayISO } from '@/lib/dates';

type Mode = 'contribute' | 'withdraw';

export function SavingsEntryDialog({
  open,
  onClose,
  goal,
  currentMinor,
  initialMode = 'contribute',
}: {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  currentMinor: number;
  initialMode?: Mode;
}) {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const currency = snapshot?.settings.currency ?? 'USD';
  const locale = snapshot?.settings.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setAmount('');
    setDate(todayISO());
    setNote('');
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [open, initialMode, goal]);

  const amountMinor = parseMoneyToMinor(amount, currency);
  const tooMuch = mode === 'withdraw' && amountMinor !== null && amountMinor > currentMinor;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const summaries: string[] = [];
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amount = `Enter an amount greater than zero, with up to ${currencyFractionDigits(currency)} decimal places.`;
      summaries.push(nextErrors.amount);
    } else if (mode === 'withdraw' && amountMinor > currentMinor) {
      nextErrors.amount = 'You cannot withdraw more than this goal currently holds.';
      summaries.push(nextErrors.amount);
    }
    if (!date) {
      nextErrors.date = 'Choose a date.';
      summaries.push(nextErrors.date);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0 || amountMinor === null || !goal) return;
    setSubmitting(true);
    try {
      await actions.addSavingsEntry(
        goal.id,
        mode === 'withdraw' ? -amountMinor : amountMinor,
        date,
        note,
      );
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
      title={goal ? `Move money — ${goal.name}` : 'Move money'}
      description="Contributions reduce spendable cash. Withdrawals bring it back. Neither is counted as spending."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            {mode === 'contribute' ? 'Add to goal' : 'Withdraw'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        <div className="payment-context">
          <span>Currently saved</span>
          <strong>{formatMoney(currentMinor, currency, locale)}</strong>
        </div>
        <SegmentedControl
          label="Savings action"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'contribute', label: 'Add money' },
            { value: 'withdraw', label: 'Withdraw' },
          ]}
        />
        <FormErrorSummary errors={formErrors} />
        <div className="form-grid form-grid--2">
          <Field label="Amount" htmlFor={`${baseId}-amount`} error={errors.amount} required>
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
          <Field label="Date" htmlFor={`${baseId}-date`} error={errors.date} required>
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
        {tooMuch ? (
          <InlineNotice tone="warning">
            This goal holds {formatMoney(currentMinor, currency, locale)}. Choose a smaller
            withdrawal.
          </InlineNotice>
        ) : null}
        <Field label="Note (optional)" htmlFor={`${baseId}-note`}>
          <Textarea
            id={`${baseId}-note`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={200}
          />
        </Field>
      </form>
    </Dialog>
  );
}
