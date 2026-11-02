import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import {
  Field,
  FormErrorSummary,
  MoneyInput,
  Select,
  TextInput,
  Textarea,
} from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { useAppData } from '@/state/AppDataProvider';
import type { IncomeSource } from '@/domain/types';
import { incomeSourceFormSchema } from '@/domain/schemas';
import {
  currencyFractionDigits,
  currencySymbol,
  minorToInput,
  parseMoneyToMinor,
} from '@/lib/money';
import { todayISO } from '@/lib/dates';

const FREQUENCIES: Array<{ value: IncomeSource['frequency']; label: string }> = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month (1st & 15th)' },
  { value: 'monthly', label: 'Once a month' },
  { value: 'one-time', label: 'One time' },
  { value: 'irregular', label: 'Irregular — I’ll add income myself' },
];

export function IncomeFormDialog({
  open,
  onClose,
  source,
}: {
  open: boolean;
  onClose: () => void;
  source: IncomeSource | null;
}) {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const currency = snapshot?.settings.currency ?? 'USD';
  const locale = snapshot?.settings.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<IncomeSource['frequency']>('biweekly');
  const [anchorDate, setAnchorDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(source?.name ?? '');
    setAmount(source ? minorToInput(source.amountMinor, currency) : '');
    setFrequency(source?.frequency ?? 'biweekly');
    setAnchorDate(source?.anchorDate ?? todayISO());
    setEndDate(source?.endDate ?? '');
    setNotes(source?.notes ?? '');
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [open, source, currency]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = incomeSourceFormSchema.safeParse({
      name,
      amount,
      frequency,
      anchorDate,
      endDate,
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
    if (amountMinor === null) {
      nextErrors.amount = `Enter a valid amount, with up to ${currencyFractionDigits(currency)} decimal places.`;
      summaries.push(nextErrors.amount);
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
        notes,
      };
      if (source) await actions.updateIncome(source.id, input);
      else await actions.createIncome(input);
      onClose();
    } catch {
      // Provider toast keeps the form intact.
    } finally {
      setSubmitting(false);
    }
  }

  const isOneTime = frequency === 'one-time';
  const isIrregular = frequency === 'irregular';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={source ? 'Edit income source' : 'Add income'}
      description="Expected paydays help Tide plan the window until your next payday. Received money is recorded separately."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            {source ? 'Save changes' : 'Add income'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        <FormErrorSummary errors={formErrors} />
        {isIrregular ? (
          <InlineNotice tone="info">
            Irregular income has no projected paydays. Add received income from the Dashboard or
            Spending page whenever money arrives.
          </InlineNotice>
        ) : null}
        <Field label="Name" htmlFor={`${baseId}-name`} error={errors.name} required>
          <TextInput
            id={`${baseId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Main paycheck, freelance, support…"
            maxLength={60}
            invalid={Boolean(errors.name)}
            autoFocus
            aria-describedby={errors.name ? `${baseId}-name-error` : undefined}
          />
        </Field>
        <div className="form-grid form-grid--2">
          <Field
            label="Expected amount"
            htmlFor={`${baseId}-amount`}
            error={errors.amount}
            required
          >
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
              onChange={(event) => setFrequency(event.target.value as IncomeSource['frequency'])}
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
            label={isOneTime ? 'Payday' : 'First expected payday'}
            htmlFor={`${baseId}-anchor`}
            error={errors.anchorDate}
            hint="Tide projects from this date."
            required
          >
            <TextInput
              id={`${baseId}-anchor`}
              type="date"
              value={anchorDate}
              onChange={(event) => setAnchorDate(event.target.value)}
              invalid={Boolean(errors.anchorDate)}
              disabled={isIrregular}
            />
          </Field>
          <Field
            label="Stop projecting after (optional)"
            htmlFor={`${baseId}-end`}
            error={errors.endDate}
          >
            <TextInput
              id={`${baseId}-end`}
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              invalid={Boolean(errors.endDate)}
              disabled={isIrregular || isOneTime}
            />
          </Field>
        </div>
        <Field label="Note (optional)" htmlFor={`${baseId}-notes`}>
          <Textarea
            id={`${baseId}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Anything that helps future you."
          />
        </Field>
      </form>
    </Dialog>
  );
}
