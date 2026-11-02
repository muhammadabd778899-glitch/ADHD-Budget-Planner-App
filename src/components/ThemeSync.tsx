import { useEffect } from 'react';
import { useAppData } from '@/state/AppDataProvider';

/**
 * Applies the saved appearance preference. "System" follows the device and keeps
 * listening while the app is open; an explicit choice stays put.
 */
export function ThemeSync() {
  const { snapshot } = useAppData();
  const theme = snapshot?.settings.theme ?? 'system';

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute('content', resolved === 'dark' ? '#101b18' : '#f7f2e8');
    };

    apply();
    if (theme !== 'system') return undefined;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return null;
}
