import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Icon } from '@/components/ui/Icon';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={['field', className ?? ''].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p className="field__hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${htmlFor}-error`}>
          <Icon name="alert-circle" size={15} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={['input', invalid ? 'input--invalid' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function MoneyInput({
  invalid,
  currencySymbol,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; currencySymbol?: string }) {
  return (
    <div
      className={['money-input', invalid ? 'money-input--invalid' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {currencySymbol ? (
        <span className="money-input__symbol" aria-hidden="true">
          {currencySymbol}
        </span>
      ) : null}
      <input
        className="money-input__input"
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        {...props}
      />
    </div>
  );
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="select-wrap">
      <select
        className={['select', invalid ? 'select--invalid' : '', className ?? '']
          .filter(Boolean)
          .join(' ')}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <Icon name="chevron-down" size={16} className="select-wrap__icon" />
    </div>
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={['textarea', invalid ? 'textarea--invalid' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={['checkbox', className ?? ''].filter(Boolean).join(' ')}>
      <input type="checkbox" className="checkbox__input" {...props} />
      <span className="checkbox__box" aria-hidden="true">
        <Icon name="check" size={13} />
      </span>
      <span className="checkbox__text">
        <span className="checkbox__label">{label}</span>
        {description ? <span className="checkbox__description">{description}</span> : null}
      </span>
    </label>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<SegmentOption<T>>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={['segmented__option', option.value === value ? 'is-active' : '']
            .filter(Boolean)
            .join(' ')}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FormGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 }) {
  return <div className={`form-grid form-grid--${columns}`}>{children}</div>;
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="form-actions">{children}</div>;
}

export function FormErrorSummary({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="form-error-summary" role="alert">
      <Icon name="alert-circle" size={18} />
      <div>
        <p className="form-error-summary__title">A couple of things need attention</p>
        <ul>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
