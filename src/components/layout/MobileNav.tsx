import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { MOBILE_NAV, MORE_NAV } from '@/components/layout/nav';
import { useAppData } from '@/state/AppDataProvider';

export function MobileNav() {
  const { openQuickAdd } = useAppData();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const moreActive = MORE_NAV.some((item) => location.pathname.startsWith(item.to));

  return (
    <>
      <nav className="mobile-nav" aria-label="Primary mobile">
        {MOBILE_NAV.slice(0, 2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              ['mobile-nav__link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')
            }
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className="mobile-nav__add"
          onClick={() => openQuickAdd({ type: 'expense' })}
          aria-label="Quick add a transaction"
        >
          <Icon name="plus" size={26} />
        </button>
        <NavLink
          to="/spending"
          className={({ isActive }) =>
            ['mobile-nav__link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')
          }
        >
          <Icon name="wallet" size={21} />
          <span>Spending</span>
        </NavLink>
        <button
          type="button"
          className={['mobile-nav__link', moreActive ? 'is-active' : ''].filter(Boolean).join(' ')}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
        >
          <Icon name="more" size={21} />
          <span>More</span>
        </button>
      </nav>

      <Dialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More"
        description="Everything else, one tap away."
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setMoreOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="more-nav">
          {MORE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="more-nav__link"
              onClick={() => setMoreOpen(false)}
            >
              <span className="more-nav__icon" aria-hidden="true">
                <Icon name={item.icon} size={20} />
              </span>
              <span>{item.label}</span>
              <Icon name="chevron-right" size={18} className="more-nav__chevron" />
            </NavLink>
          ))}
        </div>
      </Dialog>
    </>
  );
}
