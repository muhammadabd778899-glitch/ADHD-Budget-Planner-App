import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { DB_NAME, deleteDatabase } from '@/db/database';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

beforeEach(async () => {
  await deleteDatabase(DB_NAME);
});

afterEach(() => {
  cleanup();
});

describe('App smoke flow', () => {
  it('opens onboarding, completes setup, and shows the dashboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText(/Money, without the/)).toBeInTheDocument();
    expect(screen.getByText(/Your data stays in this browser/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /get started/i }));
    expect(
      await screen.findByRole('heading', { name: /A snapshot of today/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(
      await screen.findByRole('heading', { name: /When does money arrive/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open tide/i }));

    expect(
      await screen.findByRole('heading', { name: 'Today', level: 1 }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Safe to spend')).toBeInTheDocument();
  });
});
