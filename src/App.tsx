import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AppDataProvider, useAppData } from '@/state/AppDataProvider';
import { ThemeSync } from '@/components/ThemeSync';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorScreen, LoadingScreen } from '@/components/ui/Feedback';
import { DashboardPage } from '@/pages/DashboardPage';
import { IncomePage } from '@/pages/IncomePage';
import { BillsPage } from '@/pages/BillsPage';
import { SpendingPage } from '@/pages/SpendingPage';
import { DebtPage } from '@/pages/DebtPage';
import { SavingsPage } from '@/pages/SavingsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { HelpPage } from '@/pages/HelpPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function AppRoutes() {
  const { status, snapshot, error, refresh } = useAppData();

  if (status === 'error' && error) {
    return (
      <ErrorScreen
        title={error.title}
        message={error.message}
        details={error.details}
        onRetry={() => void refresh().catch(() => undefined)}
      />
    );
  }

  if (status === 'loading' || !snapshot) return <LoadingScreen />;

  if (!snapshot.settings.onboardingComplete) return <OnboardingPage />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="spending" element={<SpendingPage />} />
        <Route path="debt" element={<DebtPage />} />
        <Route path="savings" element={<SavingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="onboarding" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AppDataProvider>
          <ThemeSync />
          <AppErrorBoundary>
            <AppRoutes />
          </AppErrorBoundary>
        </AppDataProvider>
      </ToastProvider>
    </HashRouter>
  );
}
