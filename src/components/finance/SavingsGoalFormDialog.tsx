import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, FormErrorSummary, MoneyInput, TextInput, Textarea } from '@/components/ui/Form';
import { useAppData } from '@/state/AppDataProvider';
import type { SavingsGoal } from '@/domain/types';
import { savingsGoalFormSchema } from '@/domain/schemas';
import {
  currencyFractionDigits,
  currencySymbol,
  minorToInput,
  parseMoneyToMinor,
} from '@/lib/money';

const COLORS: Array<{ value: string; label: string }> = [
  { value: 'sage', label: 'Sage' },
  { value: 'sky', label: 'Sky' },
  { value: 'lavender', label: 'Lavender' },
  { value: 'apricot', label: 'Apricot' },
  { value: 'gold', label: 'Gold' },
  { value: 'rose', label: 'Rose' },
];

export function SavingsGoalFormDialog({
  open,
  onClose,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
}) {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const currency = snapshot?.settings.currency ?? 'USD';
  const locale = snapshot?.settings.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [starting, setStarting] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('sage');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? '');
    setTarget(goal ? minorToInput(goal.targetMinor, currency) : '');
    setStarting(goal ? minorToInput(goal.startingMinor, currency) : '');
    setTargetDate(goal?.targetDate ?? '');
    setColor(goal?.color ?? 'sage');
    setNotes(goal?.notes ?? '');
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [open, goal, currency]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = savingsGoalFormSchema.safeParse({
      name,
      target,
      starting,
      targetDate,
      color,
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
    const targetMinor = parseMoneyToMinor(target, currency);
    if (targetMinor === null || targetMinor <= 0) {
      nextErrors.target = `Enter a target greater than zero, with up to ${currencyFractionDigits(currency)} decimal places.`;
      summaries.push(nextErrors.target);
    }
    const startingMinor = parseMoneyToMinor(starting, currency);
    if (startingMinor === null) {
      nextErrors.starting = `Enter a valid starting amount, with up to ${currencyFractionDigits(currency)} decimal places.`;
      summaries.push(nextErrors.starting);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0 || targetMinor === null || startingMinor === null)
      return;

    setSubmitting(true);
    try {
      const input = {
        name,
        targetMinor,
        startingMinor,
        targetDate: targetDate || null,
        color,
        notes,
      };
      if (goal) await actions.updateGoal(goal.id, input);
      else await actions.createGoal(input);
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
      title={goal ? 'Edit savings goal' : 'Add a savings goal'}
      description="A goal is a place to watch progress. Moving money in or out also changes your cash on hand."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            {goal ? 'Save changes' : 'Add goal'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        <FormErrorSummary errors={formErrors} />
        <Field label="Goal name" htmlFor={`${baseId}-name`} error={errors.name} required>
          <TextInput
            id={`${baseId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Emergency fund, trip, new laptop…"
            maxLength={60}
            invalid={Boolean(errors.name)}
            autoFocus
            aria-describedby={errors.name ? `${baseId}-name-error` : undefined}
          />
        </Field>
        <div className="form-grid form-grid--2">
          <Field label="Target amount" htmlFor={`${baseId}-target`} error={errors.target} required>
            <MoneyInput
              id={`${baseId}-target`}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.target)}
              aria-describedby={errors.target ? `${baseId}-target-error` : undefined}
            />
          </Field>
          <Field
            label="Already saved"
            htmlFor={`${baseId}-starting`}
            error={errors.starting}
            hint="Money already set aside when you created this goal."
            required
          >
            <MoneyInput
              id={`${baseId}-starting`}
              value={starting}
              onChange={(event) => setStarting(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.starting)}
              aria-describedby={errors.starting ? `${baseId}-starting-error` : undefined}
            />
          </Field>
        </div>
        <div className="form-grid form-grid--2">
          <Field
            label="Target date (optional)"
            htmlFor={`${baseId}-date`}
            error={errors.targetDate}
          >
            <TextInput
              id={`${baseId}-date`}
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              invalid={Boolean(errors.targetDate)}
            />
          </Field>
          <div className="field">
            <span className="field__label" id={`${baseId}-color-label`}>
              Colour
            </span>
            <div
              className="color-options"
              role="radiogroup"
              aria-labelledby={`${baseId}-color-label`}
            >
              {COLORS.map((option) => (
                <label key={option.value} className="color-option">
                  <input
                    type="radio"
                    name={`${baseId}-color`}
                    value={option.value}
                    checked={color === option.value}
                    onChange={() => setColor(option.value)}
                  />
                  <span
                    className={`color-option__swatch color-option__swatch--${option.value}`}
                    aria-hidden="true"
                  />
                  <span className="color-option__label">{option.label}</span>
                </label>
              ))}
            </div>
            <p className="field__hint">A gentle visual cue, never the only cue.</p>
          </div>
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
