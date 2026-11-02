import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';

type Tone = 'plain' | 'sage' | 'apricot' | 'lavender' | 'sky' | 'rose' | 'stone' | 'gold';

export function Card({
  tone = 'plain',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { tone?: Tone }) {
  return (
    <section
      className={['card', `card--${tone}`, className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="card__header">
      <div className="card__heading">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="card__title">{title}</h2>
        {description ? <p className="card__description">{description}</p> : null}
      </div>
      {action ? <div className="card__action">{action}</div> : null}
    </header>
  );
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['card__body', className ?? ''].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}

export function IconTile({ name, tone = 'sage' }: { name: IconName; tone?: Tone }) {
  return (
    <span className={`icon-tile icon-tile--${tone}`} aria-hidden="true">
      <Icon name={name} size={18} />
    </span>
  );
}
