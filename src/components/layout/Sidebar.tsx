import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { BrandMark } from '@/components/ui/BrandMark';
import { NAV_GROUPS } from '@/components/layout/nav';
import { useAppData } from '@/state/AppDataProvider';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { todayISO } from '@/lib/dates';

function savedLabel(lastSavedAt: Date | null): string {
  if (!lastSavedAt) return 'Saved on this device';
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(lastSavedAt);
  return `Saved locally at ${time}`;
}

export function Sidebar() {
  const { lastSavedAt, snapshot } = useAppData();
  const online = useOnlineStatus();

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <BrandMark />
        <div>
          <p className="sidebar__wordmark">Harbor</p>
          <p className="sidebar__tagline">a safe harbor for money</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-group__label">{group.label}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  ['nav-link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')
                }
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                {item.to === '/bills' && snapshot ? (
                  <span className="nav-link__count" aria-hidden="true">
                    {snapshot.billOccurrences.filter(
                      (occurrence) =>
                        occurrence.status === 'unpaid' && occurrence.dueDate <= todayISO(),
                    ).length || ''}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="save-status" role="status">
          <span
            className={`save-status__dot ${online ? '' : 'save-status__dot--offline'}`}
            aria-hidden="true"
          />
          <div>
            <p className="save-status__label">
              {online ? savedLabel(lastSavedAt) : 'Offline · saved here'}
            </p>
            <p className="save-status__note">Only on this browser</p>
          </div>
        </div>
        <div className="sidebar__links">
          <NavLink to="/settings" className="nav-link nav-link--small">
            <Icon name="settings" size={18} />
            <span>Settings</span>
          </NavLink>
          <NavLink to="/help" className="nav-link nav-link--small">
            <Icon name="help" size={18} />
            <span>How it works</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
