'use client';

import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {cn} from '@/lib/utils';

/**
 * Sheet — operational detail side-panel.
 *
 * Used by management surfaces to show a row's full detail without
 * navigating away from the table. Slides in from the right with the
 * Stage-3 `animate-slide-in-right` keyframe. Glass surface, scroll lock,
 * focus management, Esc + backdrop dismiss.
 *
 * Composition:
 *
 *   <Sheet open={open} onClose={close} title="Tenant detail">
 *     <SheetBody>…</SheetBody>
 *     <SheetFooter>…</SheetFooter>
 *   </Sheet>
 */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Width tier. Defaults to a comfortable detail-panel width. */
  width?: 'md' | 'lg' | 'xl';
  /** When false, Esc + overlay clicks are ignored — useful for in-flight async actions. */
  dismissable?: boolean;
}

const WIDTH: Record<NonNullable<SheetProps['width']>, string> = {
  md: 'w-full max-w-md',
  lg: 'w-full max-w-2xl',
  xl: 'w-full max-w-4xl',
};

export function Sheet({open, onClose, title, description, children, width = 'lg', dismissable = true}: SheetProps) {
  const titleId       = useId();
  const descriptionId = useId();
  const sheetRef      = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = (document.activeElement as HTMLElement | null) ?? null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the sheet after mount.
    const focusTimer = window.setTimeout(() => {
      const target = sheetRef.current?.querySelector<HTMLElement>(
        '[data-autofocus],input,select,textarea,button:not([data-dismiss])',
      );
      target?.focus();
    }, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissable) onClose();
    }
    document.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, dismissable, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close panel"
        data-dismiss
        onClick={dismissable ? onClose : undefined}
        disabled={!dismissable}
        className="absolute inset-0 cursor-default bg-zinc-950/40 backdrop-blur-sm animate-fade-in-fast dark:bg-zinc-950/65"
      />

      {/* Panel */}
      <aside
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'absolute inset-y-0 right-0 flex flex-col border-l border-zinc-200/55 bg-white/95 shadow-elevated backdrop-blur-2xl animate-slide-in-right',
          'dark:border-zinc-800/55 dark:bg-zinc-950/92',
          WIDTH[width],
        )}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200/55 px-6 py-4 dark:border-zinc-800/55">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="t-h3">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="t-small mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            data-dismiss
            onClick={dismissable ? onClose : undefined}
            disabled={!dismissable}
            aria-label="Close panel"
            className="-mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-soft hover:bg-zinc-100/80 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        </header>

        {children}
      </aside>
    </div>,
    document.body,
  );
}

export function SheetBody({children, className}: {children: ReactNode; className?: string}) {
  return <div className={cn('flex-1 overflow-y-auto px-6 py-5', className)}>{children}</div>;
}

export function SheetFooter({children, className}: {children: ReactNode; className?: string}) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-zinc-200/55 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800/55 dark:bg-zinc-950/40',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * SheetSection — labelled section inside a sheet body.
 * Reduces ad-hoc `<div className="…"><h3>…</h3></div>` chains.
 */
export function SheetSection({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2 py-3 first:pt-0 last:pb-0', className)}>
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      {title && <h3 className="t-h3">{title}</h3>}
      {children}
    </section>
  );
}
