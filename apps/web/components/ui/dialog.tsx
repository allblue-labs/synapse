'use client';

import {createContext, useCallback, useContext, useEffect, useId, useRef, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {cn} from '@/lib/utils';

/**
 * Dialog — small headless modal primitive.
 *
 * Why custom (not shadcn/ui or radix): we don't want to pull in either
 * dependency just for one component. The contract is small:
 *
 *   <Dialog open={open} onClose={() => setOpen(false)} title="Resolve ticket">
 *     <DialogBody>…</DialogBody>
 *     <DialogFooter>…</DialogFooter>
 *   </Dialog>
 *
 * Behaviour:
 *   - Esc + click-outside close the dialog (unless `dismissable={false}`).
 *   - Body scroll is locked while open.
 *   - Focus moves into the dialog on mount and returns to the previous
 *     element on unmount.
 *   - Renders into `document.body` via a portal so it escapes any
 *     `overflow: hidden` parent.
 *
 * Pure presentation. The parent owns open/close state and form data.
 */

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** When false, Esc and overlay clicks are ignored — useful for in-flight async actions. */
  dismissable?: boolean;
  /** Width tier. Defaults to a comfortable form width. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

interface DialogContextValue {
  titleId: string;
  descriptionId: string;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function Dialog({open, onClose, title, description, children, dismissable = true, size = 'md'}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    if (dismissable) onClose();
  }, [dismissable, onClose]);

  // Esc to close + body scroll lock + focus management.
  useEffect(() => {
    if (!open) return;

    previousFocus.current = (document.activeElement as HTMLElement | null) ?? null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog after mount.
    const focusTimer = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>('[data-autofocus],input,select,textarea,button');
      target?.focus();
    }, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, handleClose]);

  if (typeof window === 'undefined' || !open) return null;

  const ctx: DialogContextValue = {titleId, descriptionId};

  return createPortal(
    <DialogContext.Provider value={ctx}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          aria-hidden="true"
          onClick={handleClose}
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm animate-fade-in"
        />

        {/* Panel */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            'relative z-10 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-elevated dark:border-zinc-800 dark:bg-zinc-900',
            'animate-fade-in',
            SIZE[size],
          )}
        >
          {/* Header */}
          <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={handleClose}
              disabled={!dismissable}
              className="-mt-0.5 -mr-1.5 flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          </header>

          {children}
        </div>
      </div>
    </DialogContext.Provider>,
    document.body,
  );
}

export function DialogBody({children, className}: {children: ReactNode; className?: string}) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function DialogFooter({children, className}: {children: ReactNode; className?: string}) {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/40 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950/40', className)}>
      {children}
    </div>
  );
}

/** Internal: lets nested elements re-use the context ids if needed. */
export function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialogContext must be called inside <Dialog>.');
  return ctx;
}
