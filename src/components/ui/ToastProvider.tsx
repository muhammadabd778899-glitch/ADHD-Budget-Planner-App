import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  tone: ToastTone;
  title: string;
  message?: string;
  details?: string[];
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
}

interface ToastContextValue {
  pushToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      const duration = toast.duration ?? (toast.tone === 'error' ? 9000 : 5500);
      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(() => ({ pushToast, dismissToast }), [dismissToast, pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-region" aria-live="polite" aria-atomic="false">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast--${toast.tone}`}
              role={toast.tone === 'error' ? 'alert' : 'status'}
            >
              <span className="toast__icon" aria-hidden="true">
                <Icon
                  name={
                    toast.tone === 'success'
                      ? 'check-circle'
                      : toast.tone === 'error'
                        ? 'alert-circle'
                        : 'info'
                  }
                  size={20}
                />
              </span>
              <div className="toast__body">
                <p className="toast__title">{toast.title}</p>
                {toast.message ? <p className="toast__message">{toast.message}</p> : null}
                {toast.details && toast.details.length > 0 ? (
                  <ul className="toast__details">
                    {toast.details.slice(0, 3).map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
                {toast.action ? (
                  <button
                    type="button"
                    className="toast__action"
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                className="toast__close"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): (toast: ToastInput) => string {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context.pushToast;
}

export function useToastControls(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToastControls must be used inside ToastProvider');
  return context;
}
