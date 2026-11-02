import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { UpdatePrompt } from '@/components/layout/UpdatePrompt';
import { QuickAddDialog } from '@/components/finance/QuickAddDialog';
import { Icon } from '@/components/ui/Icon';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

export function AppShell() {
  const online = useOnlineStatus();

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main-content');
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        Skip to main content
      </a>
      <ScrollToTop />
      <Sidebar />
      <div className="app-main">
        <TopBar />
        {!online ? (
          <div className="offline-bar">
            <Icon name="offline" size={16} />
            <span>You are offline. Tide still saves to this device.</span>
          </div>
        ) : null}
        <main id="main-content" className="page" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <QuickAddDialog />
      <UpdatePrompt />
    </div>
  );
}
