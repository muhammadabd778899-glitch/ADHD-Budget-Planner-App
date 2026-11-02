import { useAppData } from '@/state/AppDataProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDateOnly, todayISO } from '@/lib/dates';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function TopBar() {
  const { openQuickAdd, snapshot } = useAppData();
  const online = useOnlineStatus();
  const today = todayISO();
  const locale = snapshot?.settings.locale ?? 'en-US';
  const dateFormat = snapshot?.settings.dateFormat ?? 'medium';

  return (
    <div className="topbar">
      <div className="topbar__mobile-brand">
        <span className="brand-mark brand-mark--small" aria-hidden="true">
          <svg viewBox="0 0 32 32" role="presentation">
            <path d="M5 18c4-6 8-6 11 0s7 6 11 0" />
            <path d="M5 12c4-6 8-6 11 0s7 6 11 0" opacity="0.55" />
          </svg>
        </span>
        <span className="topbar__wordmark">Tide</span>
      </div>
      <div className="topbar__context">
        <p className="topbar__date">{formatDateOnly(today, locale, dateFormat)}</p>
        <span className="topbar__privacy">
          <Icon name="lock" size={13} />
          Private to this browser
        </span>
      </div>
      <div className="topbar__actions">
        {!online ? (
          <span className="topbar__offline">
            <Icon name="offline" size={15} />
            Offline
          </span>
        ) : null}
        <Button
          icon="plus"
          size="sm"
          onClick={() => openQuickAdd({ type: 'expense', date: today })}
        >
          Quick add
        </Button>
      </div>
    </div>
  );
}
