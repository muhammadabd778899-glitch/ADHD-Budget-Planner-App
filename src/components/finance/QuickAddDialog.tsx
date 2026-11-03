import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import {
  Field,
  FormErrorSummary,
  MoneyInput,
  SegmentedControl,
  Select,
  TextInput,
  Textarea,
  Checkbox,
} from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { useAppData } from '@/state/AppDataProvider';
import {
  currencySymbol,
  minorToInput,
  parseMoneyToMinor,
  currencyFractionDigits,
  formatMoneyShort,
} from '@/lib/money';
import { todayISO } from '@/lib/dates';
import type { TransactionType } from '@/domain/types';
import { transactionFormSchema } from '@/domain/schemas';

export function QuickAddDialog() {
  const { quickAdd, closeQuickAdd, snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [incomeSourceId, setIncomeSourceId] = useState<string | null>(null);
  const [sample, setSample] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const open = quickAdd !== null;
  const settings = snapshot?.settings;
  const currency = settings?.currency ?? 'USD';
  const locale = settings?.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const quickAmounts = [5, 10, 20, 50].map(
    (units) => units * 10 ** currencyFractionDigits(currency),
  );
  const categories = useMemo(
    () =>
      (snapshot?.categories ?? []).filter(
        (category) => !category.archived && category.kind === type,
      ),
    [snapshot?.categories, type],
  );

  useEffect(() => {
    if (!quickAdd) return;
    const nextType = quickAdd.type ?? 'expense';
    setType(nextType);
    setAmount(
      quickAdd.amountMinor !== undefined ? minorToInput(quickAdd.amountMinor, currency) : '',
    );
    setDescription(quickAdd.description ?? '');
    setCategoryId(quickAdd.categoryId ?? '');
    setAccountId(snapshot?.accounts.find((account) => !account.archived)?.id ?? '');
    setDate(quickAdd.date ?? todayISO());
    setNotes('');
    setPending(false);
    setIncomeSourceId(nextType === 'income' ? (quickAdd.incomeSourceId ?? null) : null);
    setSample(Boolean(quickAdd.sample));
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [quickAdd, currency, snapshot?.accounts]);

  useEffect(() => {
    if (!open) return;
    if (categoryId && categories.some((category) => category.id === categoryId)) return;
    setCategoryId(categories[0]?.id ?? '');
  }, [categories, categoryId, open]);

  const sourceName = incomeSourceId
    ? snapshot?.incomeSources.find((source) => source.id === incomeSourceId)?.name
    : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;
    const parsed = transactionFormSchema.safeParse({
      type,
      amount,
      date,
      description,
      categoryId: categoryId || null,
      notes,
      status: type === 'income' ? 'cleared' : pending ? 'pending' : 'cleared',
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
      if (!summaries.includes(nextErrors.amount)) summaries.push(nextErrors.amount);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0 || amountMinor === null) return;

    setSubmitting(true);
    try {
      await actions.createTransaction({
        type,
        amountMinor,
        date,
        description: description.trim(),
        categoryId: categoryId || null,
        notes,
        status: type === 'income' ? 'cleared' : pending ? 'pending' : 'cleared',
        source: incomeSourceId ? 'income' : 'manual',
        incomeSourceId: type === 'income' ? incomeSourceId : null,
        accountId: accountId || null,
        sample,
      });
      closeQuickAdd();
    } catch {
      // The provider surfaces the error in a toast; keep the form open so nothing is lost.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={closeQuickAdd}
      title={type === 'expense' ? 'Add an expense' : 'Add received income'}
      description={
        type === 'expense'
          ? 'A few details are enough. You can edit it later.'
          : 'Only record money that has actually arrived. Expected paydays stay separate.'
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={closeQuickAdd} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy} icon="plus">
            {type === 'expense' ? 'Add expense' : 'Add income'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        <SegmentedControl
          label="Transaction type"
          value={type}
          onChange={(next) => {
            setType(next);
            if (next === 'expense') {
              setIncomeSourceId(null);
              setSample(false);
            }
          }}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />

        {sourceName ? (
          <InlineNotice tone="info" title="From a projected payday">
            This will record received income for <strong>{sourceName}</strong>. The projection stays
            a projection; this transaction is the real money.
          </InlineNotice>
        ) : null}

        <FormErrorSummary errors={formErrors} />

        <div className="form-grid form-grid--2">
          <Field label="Amount" htmlFor={`${baseId}-amount`} error={errors.amount} required>
            <MoneyInput
              id={`${baseId}-amount`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.amount)}
              placeholder="0.00"
              autoFocus
              aria-describedby={errors.amount ? `${baseId}-amount-error` : undefined}
              aria-required="true"
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

        {type === 'expense' ? (
          <div className="quick-amounts" role="group" aria-label="Common expense values">
            <span className="quick-amounts__label">Quick fill</span>
            {quickAmounts.map((minor) => (
              <button
                key={minor}
                type="button"
                className="quick-amounts__chip"
                onClick={() => setAmount(minorToInput(minor, currency))}
              >
                {formatMoneyShort(minor, currency, locale)}
              </button>
            ))}
          </div>
        ) : null}

        <Field
          label="Description"
          htmlFor={`${baseId}-description`}
          error={errors.description}
          required
        >
          <TextInput
            id={`${baseId}-description`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={
              type === 'expense' ? 'Coffee, groceries, bus…' : 'Freelance invoice, refund…'
            }
            maxLength={120}
            invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? `${baseId}-description-error` : undefined}
          />
        </Field>

        <Field
          label="Category"
          htmlFor={`${baseId}-category`}
          hint={categories.length === 0 ? 'Add a category in Settings first.' : undefined}
        >
          <Select
            id={`${baseId}-category`}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={categories.length === 0}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        {(snapshot?.accounts.length ?? 0) > 1 ? (
          <Field label="Account" htmlFor={`${baseId}-account`} hint="Where the money moved.">
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

        {type === 'expense' ? (
          <Checkbox
            label="This payment is still pending"
            description="Pending expenses are shown separately and do not reduce cash on hand until you clear them."
            checked={pending}
            onChange={(event) => setPending(event.target.checked)}
          />
        ) : null}

        <details className="disclosure disclosure--quiet">
          <summary>Add a note (optional)</summary>
          <div className="disclosure__body">
            <Field label="Note" htmlFor={`${baseId}-notes`}>
              <Textarea
                id={`${baseId}-notes`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Anything you want to remember."
              />
            </Field>
          </div>
        </details>
      </form>
    </Dialog>
  );
}
