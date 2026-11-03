import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@/components/ui/Dialog';
import { useAppData } from '@/state/AppDataProvider';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function KeyboardShortcuts({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { openQuickAdd } = useAppData();
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector('dialog[open]')) return;

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        openQuickAdd({ type: 'expense' });
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        onOpenChange(true);
        return;
      }
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault();
        navigate('/bills');
        return;
      }
      if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        navigate('/');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, onOpenChange, openQuickAdd]);

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Keyboard shortcuts"
      description="A few keys for the actions you use most. They pause while you are typing."
      size="sm"
    >
      <div className="shortcut-list">
        <div className="shortcut-list__row">
          <span>Add an expense</span>
          <kbd>N</kbd>
        </div>
        <div className="shortcut-list__row">
          <span>Open Today</span>
          <kbd>T</kbd>
        </div>
        <div className="shortcut-list__row">
          <span>Open Bills</span>
          <kbd>B</kbd>
        </div>
        <div className="shortcut-list__row">
          <span>Show this list</span>
          <kbd>?</kbd>
        </div>
      </div>
      <p className="dialog__note">
        Dialogues and forms always keep the keyboard first. Shortcuts never fire while a field is
        focused.
      </p>
    </Dialog>
  );
}
