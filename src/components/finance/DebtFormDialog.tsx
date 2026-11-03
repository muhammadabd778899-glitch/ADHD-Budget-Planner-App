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
import { useAppData } from '@/state/AppDataProvider';
import type { Debt } from '@/domain/types';
import { debtFormSchema } from '@/domain/schemas';
import {
  currencyFractionDigits,
  currencySymbol,
  minorToInput,
  parseMoneyToMinor,
} from '@/lib/money';
import { bpsToPercentInput, parsePercentToBps } from '@/lib/rates';

const KINDS: Array<{ value: Debt['kind']; label: string }> = [
  { value: 'credit-card', label: 'Credit card' },
  { value: 'loan', label: 'Personal loan' },
  { value: 'student-loan', label: 'Student loan' },
  { value: 'auto', label: 'Auto loan' },
  { value: 'medical', label: 'Medical debt' },
  { value: 'other', label: 'Other' },
];

export function DebtFormDialog({
  open,
  onClose,
  debt,
}: {
  open: boolean;
  onClose: () => void;
  debt: Debt | null;
}) {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const currency = snapshot?.settings.currency ?? 'USD';
  const locale = snapshot?.settings.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Debt['kind']>('credit-card');
  const [balance, setBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [targetPayoffDate, setTargetPayoffDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(debt?.name ?? '');
    setKind(debt?.kind ?? 'credit-card');
    setBalance(debt ? minorToInput(debt.balanceMinor, currency) : '');
    setInterestRate(
      debt?.interestRateBps !== null && debt?.interestRateBps !== undefined
        ? bpsToPercentInput(debt.interestRateBps)
        : '',
    );
    setMinimumPayment(
      debt?.minimumPaymentMinor !== null && debt?.minimumPaymentMinor !== undefined
        ? minorToInput(debt.minimumPaymentMinor, currency)
        : '',
    );
    setTargetPayoffDate(debt?.targetPayoffDate ?? '');
    setNotes(debt?.notes ?? '');
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [open, debt, currency]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = debtFormSchema.safeParse({
      name,
      kind,
      balance,
      interestRate,
      minimumPayment,
      targetPayoffDate,
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
    const balanceMinor = parseMoneyToMinor(balance, currency);
    if (balanceMinor === null) {
      nextErrors.balance = `Enter a valid balance, with up to ${currencyFractionDigits(currency)} decimal places.`;
      summaries.push(nextErrors.balance);
    }
    const minimumPaymentMinor = minimumPayment.trim()
      ? parseMoneyToMinor(minimumPayment, currency)
      : null;
    if (minimumPayment.trim() && minimumPaymentMinor === null) {
      nextErrors.minimumPayment = 'Enter a valid minimum payment, or leave it blank.';
      summaries.push(nextErrors.minimumPayment);
    }
    const interestRateBps = interestRate.trim() ? parsePercentToBps(interestRate) : null;
    if (interestRate.trim() && interestRateBps === null) {
      nextErrors.interestRate = 'Enter an annual rate between 0 and 100, or leave it blank.';
      summaries.push(nextErrors.interestRate);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0 || balanceMinor === null) return;

    setSubmitting(true);
    try {
      const input = {
        name,
        kind,
        balanceMinor,
        interestRateBps,
        minimumPaymentMinor,
        targetPayoffDate: targetPayoffDate || null,
        notes,
      };
      if (debt) await actions.updateDebt(debt.id, input);
      else await actions.createDebt(input);
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
      title={debt ? 'Edit debt' : 'Add a debt'}
      description="Enter the balance as it is today. Record payments as you make them and Harbor keeps the balance in step."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            {debt ? 'Save changes' : 'Add debt'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        <FormErrorSummary errors={formErrors} />
        <div className="form-grid form-grid--2">
          <Field label="Name" htmlFor={`${baseId}-name`} error={errors.name} required>
            <TextInput
              id={`${baseId}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Visa, car loan, student loan…"
              maxLength={60}
              invalid={Boolean(errors.name)}
              autoFocus
              aria-describedby={errors.name ? `${baseId}-name-error` : undefined}
            />
          </Field>
          <Field label="Type" htmlFor={`${baseId}-kind`}>
            <Select
              id={`${baseId}-kind`}
              value={kind}
              onChange={(event) => setKind(event.target.value as Debt['kind'])}
            >
              {KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="form-grid form-grid--2">
          <Field
            label="Current balance"
            htmlFor={`${baseId}-balance`}
            error={errors.balance}
            hint="As of today, before any new payments."
            required
          >
            <MoneyInput
              id={`${baseId}-balance`}
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.balance)}
              aria-describedby={errors.balance ? `${baseId}-balance-error` : undefined}
            />
          </Field>
          <Field
            label="Annual interest rate (optional)"
            htmlFor={`${baseId}-rate`}
            error={errors.interestRate}
            hint="Used only for a labelled estimate."
          >
            <div className="input-suffix">
              <TextInput
                id={`${baseId}-rate`}
                value={interestRate}
                onChange={(event) => setInterestRate(event.target.value)}
                inputMode="decimal"
                placeholder="21.99"
                invalid={Boolean(errors.interestRate)}
                aria-describedby={errors.interestRate ? `${baseId}-rate-error` : undefined}
              />
              <span aria-hidden="true">%</span>
            </div>
          </Field>
        </div>
        <div className="form-grid form-grid--2">
          <Field
            label="Minimum monthly payment (optional)"
            htmlFor={`${baseId}-minimum`}
            error={errors.minimumPayment}
          >
            <MoneyInput
              id={`${baseId}-minimum`}
              value={minimumPayment}
              onChange={(event) => setMinimumPayment(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.minimumPayment)}
              aria-describedby={errors.minimumPayment ? `${baseId}-minimum-error` : undefined}
            />
          </Field>
          <Field
            label="Target payoff date (optional)"
            htmlFor={`${baseId}-target`}
            error={errors.targetPayoffDate}
          >
            <TextInput
              id={`${baseId}-target`}
              type="date"
              value={targetPayoffDate}
              onChange={(event) => setTargetPayoffDate(event.target.value)}
              invalid={Boolean(errors.targetPayoffDate)}
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
          />
        </Field>
      </form>
    </Dialog>
  );
}
