import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import {
  Checkbox,
  Field,
  FormErrorSummary,
  MoneyInput,
  SegmentedControl,
  Select,
  TextInput,
  Textarea,
} from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { useAppData } from '@/state/AppDataProvider';
import type { Transaction, TransactionType } from '@/domain/types';
import {
  currencyFractionDigits,
  currencySymbol,
  minorToInput,
  parseMoneyToMinor,
} from '@/lib/money';
import { transactionFormSchema } from '@/domain/schemas';
import { todayISO } from '@/lib/dates';

export function TransactionFormDialog({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}) {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const settings = snapshot?.settings;
  const currency = settings?.currency ?? 'USD';
  const locale = settings?.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isBillPayment = Boolean(transaction?.billOccurrenceId);
  const accounts = useMemo(() => snapshot?.accounts ?? [], [snapshot?.accounts]);
  const categories = useMemo(
    () =>
      (snapshot?.categories ?? []).filter(
        (category) => !category.archived && category.kind === type,
      ),
    [snapshot?.categories, type],
  );

  useEffect(() => {
    if (!open) return;
    const nextType = transaction?.type ?? 'expense';
    setType(nextType);
    setAmount(transaction ? minorToInput(transaction.amountMinor, currency) : '');
    setDate(transaction?.date ?? todayISO());
    setDescription(transaction?.description ?? '');
    setCategoryId(transaction?.categoryId ?? '');
    setAccountId(transaction?.accountId ?? accounts.find((account) => !account.archived)?.id ?? '');
    setNotes(transaction?.notes ?? '');
    setPending(transaction?.status === 'pending');
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [open, transaction, currency, accounts]);

  useEffect(() => {
    if (!open) return;
    if (categoryId && categories.some((category) => category.id === categoryId)) return;
    setCategoryId(categories[0]?.id ?? '');
  }, [categories, categoryId, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      summaries.push(nextErrors.amount);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0 || amountMinor === null) return;

    setSubmitting(true);
    try {
      const input = {
        type,
        amountMinor,
        date,
        description,
        categoryId: categoryId || null,
        notes,
        status: (type === 'income' ? 'cleared' : pending ? 'pending' : 'cleared') as
          'cleared' | 'pending',
        source: transaction?.source,
        billId: transaction?.billId ?? null,
        billOccurrenceId: transaction?.billOccurrenceId ?? null,
        debtId: transaction?.debtId ?? null,
        incomeSourceId: transaction?.incomeSourceId ?? null,
        accountId: accountId || null,
        sample: transaction?.sample ?? false,
      };
      if (transaction) await actions.updateTransaction(transaction.id, input);
      else await actions.createTransaction(input);
      onClose();
    } catch {
      // Provider shows the user-safe error.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={transaction ? 'Edit transaction' : 'Add a transaction'}
      description="Changes are saved only on this device."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            {transaction ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        {isBillPayment ? (
          <InlineNotice tone="info" title="This is linked to a bill">
            To change the amount, date, or category, mark the bill unpaid on the Bills page first.
            That keeps the bill and your spending in sync. You can still edit the description and
            note here.
          </InlineNotice>
        ) : null}
        <FormErrorSummary errors={formErrors} />
        <SegmentedControl
          label="Transaction type"
          value={type}
          onChange={(next) => {
            setType(next);
            if (next === 'income') setPending(false);
          }}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />
        <div className="form-grid form-grid--2">
          <Field label="Amount" htmlFor={`${baseId}-amount`} error={errors.amount} required>
            <MoneyInput
              id={`${baseId}-amount`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.amount)}
              disabled={isBillPayment}
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
              disabled={isBillPayment}
              aria-describedby={errors.date ? `${baseId}-date-error` : undefined}
            />
          </Field>
        </div>
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
            maxLength={120}
            invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? `${baseId}-description-error` : undefined}
          />
        </Field>
        <Field label="Category" htmlFor={`${baseId}-category`}>
          <Select
            id={`${baseId}-category`}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={isBillPayment}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        {accounts.length > 1 ? (
          <Field
            label="Account"
            htmlFor={`${baseId}-account`}
            hint="Which account the money moved through."
          >
            <Select
              id={`${baseId}-account`}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              disabled={isBillPayment}
            >
              {accounts
                .filter((account) => !account.archived || account.id === accountId)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </Select>
          </Field>
        ) : null}
        {type === 'expense' && !isBillPayment ? (
          <Checkbox
            label="Still pending"
            description="Pending expenses are not counted in cash on hand."
            checked={pending}
            onChange={(event) => setPending(event.target.checked)}
          />
        ) : null}
        <Field label="Note" htmlFor={`${baseId}-notes`}>
          <Textarea
            id={`${baseId}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={500}
          />
        </Field>
      </form>
    </Dialog>
  );
}
