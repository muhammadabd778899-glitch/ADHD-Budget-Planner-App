import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import {
  Checkbox,
  Field,
  FormErrorSummary,
  MoneyInput,
  Select,
  TextInput,
} from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { useAppData } from '@/state/AppDataProvider';
import type { Envelope } from '@/domain/types';
import { envelopeFormSchema } from '@/domain/schemas';
import {
  currencyFractionDigits,
  currencySymbol,
  minorToInput,
  parseMoneyToMinor,
} from '@/lib/money';

export function EnvelopeFormDialog({
  open,
  onClose,
  envelope,
}: {
  open: boolean;
  onClose: () => void;
  envelope: Envelope | null;
}) {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const currency = snapshot?.settings.currency ?? 'USD';
  const locale = snapshot?.settings.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [rollover, setRollover] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const categories = useMemo(() => {
    const used = new Set(
      (snapshot?.envelopes ?? [])
        .filter((row) => !row.archived && row.id !== envelope?.id)
        .map((row) => row.categoryId),
    );
    return (snapshot?.categories ?? []).filter(
      (category) => category.kind === 'expense' && !category.archived && !used.has(category.id),
    );
  }, [snapshot?.categories, snapshot?.envelopes, envelope?.id]);

  useEffect(() => {
    if (!open) return;
    setName(envelope?.name ?? '');
    setCategoryId(envelope?.categoryId ?? '');
    setMonthlyAmount(envelope ? minorToInput(envelope.monthlyAmountMinor, currency) : '');
    setRollover(envelope?.rollover ?? true);
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [open, envelope, currency]);

  useEffect(() => {
    if (!open) return;
    if (categoryId && categories.some((category) => category.id === categoryId)) return;
    setCategoryId(categories[0]?.id ?? '');
  }, [categories, categoryId, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = envelopeFormSchema.safeParse({
      name,
      categoryId,
      monthlyAmount,
      rollover,
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
    const amountMinor = parseMoneyToMinor(monthlyAmount, currency);
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.monthlyAmount = `Enter a monthly amount greater than zero, with up to ${currencyFractionDigits(currency)} decimal places.`;
      summaries.push(nextErrors.monthlyAmount);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0 || amountMinor === null) return;

    setSubmitting(true);
    try {
      const input = { name, categoryId, monthlyAmountMinor: amountMinor, rollover };
      if (envelope) await actions.updateEnvelope(envelope.id, input);
      else await actions.createEnvelope(input);
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
      title={envelope ? 'Edit envelope' : 'Add an envelope'}
      description="An envelope is a monthly spending limit for a category. It shows how much of this month's plan is left."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            {envelope ? 'Save changes' : 'Add envelope'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        <FormErrorSummary errors={formErrors} />
        <InlineNotice tone="info" title="Envelopes guide spending without reserving cash">
          Harbor compares cleared expenses in this category with the monthly amount. It does not
          move or lock money, so safe to spend is unchanged.
        </InlineNotice>
        <Field label="Envelope name" htmlFor={`${baseId}-name`} error={errors.name} required>
          <TextInput
            id={`${baseId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Groceries, eating out, fun money…"
            maxLength={40}
            invalid={Boolean(errors.name)}
            autoFocus
            aria-describedby={errors.name ? `${baseId}-name-error` : undefined}
          />
        </Field>
        <div className="form-grid form-grid--2">
          <Field
            label="Category"
            htmlFor={`${baseId}-category`}
            error={errors.categoryId}
            hint={
              categories.length === 0
                ? 'Every expense category already has an envelope.'
                : undefined
            }
            required
          >
            <Select
              id={`${baseId}-category`}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={categories.length === 0}
              invalid={Boolean(errors.categoryId)}
            >
              {categories.length === 0 ? <option value="">No categories available</option> : null}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Monthly amount"
            htmlFor={`${baseId}-amount`}
            error={errors.monthlyAmount}
            required
          >
            <MoneyInput
              id={`${baseId}-amount`}
              value={monthlyAmount}
              onChange={(event) => setMonthlyAmount(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.monthlyAmount)}
              aria-describedby={errors.monthlyAmount ? `${baseId}-amount-error` : undefined}
            />
          </Field>
        </div>
        <Checkbox
          label="Carry unused money into next month"
          description="When on, the envelope keeps a running balance. When off, only this month's amount matters."
          checked={rollover}
          onChange={(event) => setRollover(event.target.checked)}
        />
      </form>
    </Dialog>
  );
}
