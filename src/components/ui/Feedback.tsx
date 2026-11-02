import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button, ButtonLink } from '@/components/ui/Button';

export type StatusTone = 'positive' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent';

const statusIcon: Record<StatusTone, IconName> = {
  positive: 'check-circle',
  warning: 'alert-circle',
  danger: 'alert-circle',
  neutral: 'dot',
  info: 'info',
  accent: 'sparkle',
};

export function Badge({
  tone = 'neutral',
  children,
  icon,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  icon?: IconName;
  className?: string;
}) {
  return (
    <span className={['badge', `badge--${tone}`, className ?? ''].filter(Boolean).join(' ')}>
      <Icon name={icon ?? statusIcon[tone]} size={13} />
      <span>{children}</span>
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  tone = 'sage',
  size = 'md',
  showValue = true,
}: {
  value: number;
  label: string;
  tone?: 'sage' | 'sky' | 'lavender' | 'apricot' | 'gold' | 'rose';
  size?: 'sm' | 'md';
  showValue?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`progress progress--${size}`}>
      <div className="progress__meta">
        <span>{label}</span>
        {showValue ? <span className="progress__value">{clamped}%</span> : null}
      </div>
      <div
        className={`progress__track progress__track--${tone}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label}
      >
        <span className="progress__fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  icon = 'sparkle',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__description">{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function InlineNotice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="notice__icon" aria-hidden="true">
        <Icon
          name={tone === 'success' ? 'check-circle' : tone === 'info' ? 'info' : 'alert-circle'}
          size={18}
        />
      </span>
      <div className="notice__body">
        {title ? <p className="notice__title">{title}</p> : null}
        <div className="notice__message">{children}</div>
        {action ? <div className="notice__action">{action}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="skeleton__line" style={{ width: `${100 - index * 12}%` }} />
      ))}
    </div>
  );
}

export function LoadingScreen({ label = 'Opening your local plan…' }: { label?: string }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <span className="loading-screen__mark" aria-hidden="true">
        <Icon name="sparkle" size={26} />
      </span>
      <div>
        <p className="loading-screen__title">Tide</p>
        <p className="loading-screen__label">{label}</p>
      </div>
      <Skeleton lines={2} />
    </div>
  );
}

export function ErrorScreen({
  title,
  message,
  details,
  onRetry,
}: {
  title: string;
  message: string;
  details?: string[];
  onRetry?: () => void;
}) {
  return (
    <main className="error-screen" id="main-content">
      <div className="error-screen__card">
        <span className="error-screen__icon" aria-hidden="true">
          <Icon name="alert-circle" size={28} />
        </span>
        <h1>{title}</h1>
        <p>{message}</p>
        {details && details.length > 0 ? (
          <details className="disclosure">
            <summary>Technical details</summary>
            <ul>
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="error-screen__actions">
          <Button onClick={onRetry ?? (() => window.location.reload())} icon="refresh">
            Try again
          </Button>
          <ButtonLink to="/help" variant="secondary">
            Troubleshooting help
          </ButtonLink>
        </div>
        <p className="error-screen__privacy">
          Tide did not send your data anywhere. If this keeps happening, reload the page and avoid
          clearing site data.
        </p>
      </div>
    </main>
  );
}

export function Metric({
  label,
  value,
  note,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  note?: ReactNode;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'accent';
}) {
  return (
    <div className={`metric metric--${tone}`}>
      <p className="metric__label">{label}</p>
      <p className="metric__value">{value}</p>
      {note ? <div className="metric__note">{note}</div> : null}
    </div>
  );
}

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary>{summary}</summary>
      <div className="disclosure__body">{children}</div>
    </details>
  );
}
