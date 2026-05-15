'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {AlertOctagon, AlertTriangle, CheckCircle2, Info, X, type LucideIcon} from 'lucide-react';
import {cn} from '@/lib/utils';

/**
 * Toast — minimal global notifier for action feedback.
 *
 * Why custom: keep dependencies low. The contract is intentionally narrow:
 *
 *   const {toast} = useToast();
 *   toast({variant: 'success', title: 'Ticket resolved.'});
 *   toast({variant: 'error', title: 'Could not resolve.', description: '…'});
 *
 * Toasts auto-dismiss after `durationMs` (default 4000ms) and are
 * stacked top-right above all page chrome via a single portal.
 */

export type ToastVariant = 'success' | 'error' | 'forbidden' | 'info';

export interface ToastInput {
  variant?: ToastVariant;
  title: string;
  description?: string;
  /** Auto-dismiss after this many ms. Pass `0` to keep until manually closed. */
  durationMs?: number;
}

interface ToastEntry extends Required<Omit<ToastInput, 'description'>> {
  id: string;
  description?: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.');
  return ctx;
}

const VARIANT_STYLE: Record<ToastVariant, {icon: LucideIcon; tone: string; iconTone: string}> = {
  success: {
    icon: CheckCircle2,
    tone: 'border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-100',
    iconTone: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    icon: AlertOctagon,
    tone: 'border-red-200/80 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-100',
    iconTone: 'text-red-600 dark:text-red-400',
  },
  forbidden: {
    icon: AlertTriangle,
    tone: 'border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-100',
    iconTone: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    icon: Info,
    tone: 'border-zinc-200 bg-white text-zinc-900 shadow-card dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100',
    iconTone: 'text-zinc-500 dark:text-zinc-400',
  },
};

let toastCounter = 0;

export function ToastProvider({children}: {children: ReactNode}) {
  const [items, setItems] = useState<ReadonlyArray<ToastEntry>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput): string => {
    toastCounter += 1;
    const id = `t-${Date.now()}-${toastCounter}`;
    const entry: ToastEntry = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'info',
      durationMs: input.durationMs ?? 4000,
    };
    setItems((current) => [...current, entry]);

    if (entry.durationMs > 0) {
      window.setTimeout(() => {
        setItems((current) => current.filter((t) => t.id !== id));
      }, entry.durationMs);
    }
    return id;
  }, []);

  const value = useMemo<ToastContextValue>(() => ({toast, dismiss}), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && createPortal(
        <div
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-none fixed right-5 top-5 z-[110] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2"
        >
          {items.map((t) => {
            const v = VARIANT_STYLE[t.variant];
            const Icon = v.icon;
            return (
              <div
                key={t.id}
                role={t.variant === 'error' ? 'alert' : 'status'}
                className={cn(
                  'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 backdrop-blur shadow-elevated animate-slide-in-right',
                  v.tone,
                )}
              >
                <Icon size={16} className={cn('mt-0.5 shrink-0', v.iconTone)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-tight">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-current opacity-50 transition-opacity hover:opacity-100"
                  aria-label="Dismiss notification"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
