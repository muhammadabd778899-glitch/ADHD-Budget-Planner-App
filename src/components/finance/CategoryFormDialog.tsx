import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, FormErrorSummary, SegmentedControl, TextInput } from '@/components/ui/Form';
import { useAppData } from '@/state/AppDataProvider';
import type { Category, CategoryKind } from '@/domain/types';

const COLORS = ['sage', 'sky', 'lavender', 'apricot', 'gold', 'rose', 'stone'];

export function CategoryFormDialog({
  open,
  onClose,
  category,
  defaultKind = 'expense',
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  defaultKind?: CategoryKind;
}) {
  const { actions, busy } = useAppData();
  const baseId = useId();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>(defaultKind);
  const [color, setColor] = useState('sage');
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setKind(category?.kind ?? defaultKind);
    setColor(category?.color ?? 'sage');
    setError('');
    setFormErrors([]);
    setSubmitting(false);
  }, [open, category, defaultKind]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Give the category a name.');
      setFormErrors(['Give the category a name.']);
      return;
    }
    setSubmitting(true);
    try {
      if (category) await actions.updateCategory(category.id, { name, kind, color });
      else await actions.createCategory({ name, kind, color });
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
      title={category ? 'Edit category' : 'Add a category'}
      description="Categories are quiet labels, not a second budget to maintain."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={submitting || busy}>
            {category ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="stack">
        <FormErrorSummary errors={formErrors} />
        {category ? null : (
          <SegmentedControl
            label="Category kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
          />
        )}
        <Field label="Name" htmlFor={`${baseId}-name`} error={error} required>
          <TextInput
            id={`${baseId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            invalid={Boolean(error)}
            autoFocus
            aria-describedby={error ? `${baseId}-name-error` : undefined}
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
              <label key={option} className="color-option">
                <input
                  type="radio"
                  name={`${baseId}-color`}
                  value={option}
                  checked={color === option}
                  onChange={() => setColor(option)}
                />
                <span
                  className={`color-option__swatch color-option__swatch--${option}`}
                  aria-hidden="true"
                />
                <span className="color-option__label">{option}</span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
