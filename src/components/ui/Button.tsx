import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
type Size = 'sm' | 'md' | 'lg';

function classes(variant: Variant, size: Size, iconOnly: boolean, className?: string): string {
  return [
    'button',
    `button--${variant}`,
    `button--${size}`,
    iconOnly ? 'button--icon' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconAfter?: IconName;
  loading?: boolean;
  iconOnly?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  loading = false,
  iconOnly = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes(variant, size, iconOnly, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={18} />
      ) : null}
      {!iconOnly ? <span>{children}</span> : null}
      {iconAfter ? <Icon name={iconAfter} size={18} /> : null}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconAfter?: IconName;
  children: ReactNode;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={classes(variant, size, false, className)} {...props}>
      {icon ? <Icon name={icon} size={18} /> : null}
      <span>{children}</span>
      {iconAfter ? <Icon name={iconAfter} size={18} /> : null}
    </Link>
  );
}
