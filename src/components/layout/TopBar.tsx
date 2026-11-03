import { useAppData } from '@/state/AppDataProvider';
import { Button } from '@/components/ui/Button';
import { BrandMark } from '@/components/ui/BrandMark';
import { Icon } from '@/components/ui/Icon';
import { formatDateOnly, todayISO } from '@/lib/dates';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function TopBar({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const { openQuickAdd, snapshot } = useAppData();
  const online = useOnlineStatus();
  const today = todayISO();
  const locale = snapshot?.settings.locale ?? 'en-US';
  const dateFormat = snapshot?.settings.dateFormat ?? 'medium';

  return (
    <div className="topbar">
      <div className="topbar__mobile-brand">
        <BrandMark className="brand-mark--small" />
        <span className="topbar__wordmark">Harbor</span>
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
        <button
          type="button"
          className="topbar__shortcuts"
          onClick={onShowShortcuts}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>
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
