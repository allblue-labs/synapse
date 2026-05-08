import {AlertOctagon, Inbox, Lock, ServerCrash} from 'lucide-react';
import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';

/**
 * LoadState — shared primitive for the four honest non-data states a
 * page can land in: empty, error, forbidden, not-found. Renders a
 * dashed-outline card with an icon, headline, optional detail and an
 * optional action slot.
 *
 * Per the contract pack's AppSec section we never auto-retry — the
 * caller decides whether to show a retry button.
 */
export interface LoadStateProps {
  variant: 'empty' | 'error' | 'forbidden' | 'not-found';
  title: string;
  description?: string;
  /** Optional action area (button, link, helper text). */
  action?: ReactNode;
  className?: string;
}

const VARIANT = {
  empty: {
    icon:   Inbox,
    accent: 'text-zinc-400 dark:text-zinc-500',
    border: 'border-zinc-200 dark:border-zinc-800',
    bg:     'bg-white/40 dark:bg-zinc-900/40',
  },
  error: {
    icon:   ServerCrash,
    accent: 'text-red-500 dark:text-red-400',
    border: 'border-red-200/70 dark:border-red-800/60',
    bg:     'bg-red-50/40 dark:bg-red-900/15',
  },
  forbidden: {
    icon:   Lock,
    accent: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/70 dark:border-amber-800/60',
    bg:     'bg-amber-50/40 dark:bg-amber-900/15',
  },
  'not-found': {
    icon:   AlertOctagon,
    accent: 'text-zinc-400 dark:text-zinc-500',
    border: 'border-zinc-200 dark:border-zinc-800',
    bg:     'bg-white/40 dark:bg-zinc-900/40',
  },
} as const;

export function LoadState({variant, title, description, action, className}: LoadStateProps) {
  const v = VARIANT[variant];
  const Icon = v.icon;
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-dashed p-10 text-center',
        v.border,
        v.bg,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />
      <div className="relative mx-auto max-w-md">
        <div className={cn('mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/80 ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-800', v.accent)}>
          <Icon size={18} />
        </div>
        <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
