import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/ToastProvider';

export function UpdatePrompt() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(
          () => {
            void registration.update();
          },
          60 * 60 * 1000,
        );
      }
    },
    onRegisterError(error) {
      console.warn('Harbor could not register its offline worker.', error);
    },
  });

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="update-banner__icon" aria-hidden="true">
        <Icon name={needRefresh ? 'refresh' : 'offline'} size={19} />
      </span>
      <div className="update-banner__body">
        <p className="update-banner__title">
          {needRefresh ? 'A new version of Harbor is ready' : 'Harbor is ready offline'}
        </p>
        <p className="update-banner__message">
          {needRefresh
            ? 'Reload when you are at a stopping point. Your saved data stays in this browser.'
            : 'The app shell is cached on this device. Core features work without a connection.'}
        </p>
      </div>
      <div className="update-banner__actions">
        {needRefresh ? (
          <Button
            size="sm"
            onClick={() => {
              const openDialog = document.querySelector('dialog[open]');
              if (openDialog) {
                toast({
                  tone: 'info',
                  title: 'Finish this form first',
                  message: 'Close the open form before reloading so nothing you typed is lost.',
                });
                return;
              }
              void updateServiceWorker(true);
            }}
          >
            Reload now
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (needRefresh) setNeedRefresh(false);
            else setOfflineReady(false);
          }}
        >
          {needRefresh ? 'Later' : 'Dismiss'}
        </Button>
      </div>
    </div>
  );
}
