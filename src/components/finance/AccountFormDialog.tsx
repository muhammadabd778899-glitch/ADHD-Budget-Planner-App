import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, FormErrorSummary, MoneyInput, Select, TextInput } from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { useAppData } from '@/state/AppDataProvider';
import type { Account, AccountKind } from '@/domain/types';
import { DEFAULT_ACCOUNT_ID } from '@/domain/accounts';
import {
  currencyFractionDigits,
  currencySymbol,
  minorToInput,
  parseMoneyToMinor,
} from '@/lib/money';

const KINDS: Array<{ value: AccountKind; label: string }> = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit card' },
];

export function AccountFormDialog({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: Account | null;
}) {
  const { snapshot, actions, busy } = useAppData();
  const baseId = useId();
  const settings = snapshot?.settings;
  const currency = settings?.currency ?? 'USD';
  const locale = settings?.locale ?? 'en-US';
  const symbol = currencySymbol(currency, locale);
  const isMain = account?.id === DEFAULT_ACCOUNT_ID;
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('checking');
  const [opening, setOpening] = useState('0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? '');
    setKind(account?.kind ?? 'checking');
    setOpening(
      minorToInput(
        account
          ? account.id === DEFAULT_ACCOUNT_ID
            ? (settings?.startingBalanceMinor ?? 0)
            : account.openingBalanceMinor
          : 0,
        currency,
      ),
    );
    setErrors({});
    setFormErrors([]);
    setSubmitting(false);
  }, [open, account, currency, settings?.startingBalanceMinor]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const summaries: string[] = [];
    if (!name.trim()) {
      nextErrors.name = 'Name is required.';
      summaries.push(nextErrors.name);
    }
    const openingMinor = parseMoneyToMinor(opening, currency);
    if (openingMinor === null) {
      nextErrors.opening = `Enter a valid amount with up to ${currencyFractionDigits(currency)} decimal places.`;
      summaries.push(nextErrors.opening);
    }
    setErrors(nextErrors);
    setFormErrors(summaries);
    if (Object.keys(nextErrors).length > 0 || openingMinor === null) return;

    setSubmitting(true);
    try {
      const input = { name, kind, openingBalanceMinor: openingMinor };
      if (account) await actions.updateAccount(account.id, input);
      else await actions.createAccount(input);
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
      title={account ? 'Edit account' : 'Add an account'}
      description="Accounts label where money lives. They do not move money."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            {account ? 'Save account' : 'Add account'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        <FormErrorSummary errors={formErrors} />
        <Field label="Account name" htmlFor={`${baseId}-name`} error={errors.name} required>
          <TextInput
            id={`${baseId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Checking, cash wallet…"
            maxLength={40}
            invalid={Boolean(errors.name)}
            autoFocus
          />
        </Field>
        <div className="form-grid form-grid--2">
          <Field label="Kind" htmlFor={`${baseId}-kind`}>
            <Select
              id={`${baseId}-kind`}
              value={kind}
              onChange={(event) => setKind(event.target.value as AccountKind)}
            >
              {KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Opening balance"
            htmlFor={`${baseId}-opening`}
            error={errors.opening}
            hint={
              isMain
                ? 'The main account uses the starting point in Settings.'
                : 'The amount already in this account today.'
            }
            required
          >
            <MoneyInput
              id={`${baseId}-opening`}
              value={opening}
              onChange={(event) => setOpening(event.target.value)}
              currencySymbol={symbol}
              invalid={Boolean(errors.opening)}
            />
          </Field>
        </div>
        {isMain ? (
          <InlineNotice tone="info" title="Main account">
            Saving here also updates “Money on hand at the start” in Settings, so the overall plan
            keeps the same meaning.
          </InlineNotice>
        ) : null}
      </form>
    </Dialog>
  );
}
