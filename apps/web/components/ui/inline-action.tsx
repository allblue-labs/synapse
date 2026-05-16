'use client';

import {forwardRef, type ButtonHTMLAttributes, type ReactNode} from 'react';
import {Spinner} from '@/components/ui/spinner';
import {cn} from '@/lib/utils';

/**
 * InlineAction — small operational action button used inside table rows
 * and detail sheets. Owns its own pending state so each cell can have
 * an independent spinner without callers wiring `useTransition` boilerplate.
 *
 * Pass `pending` from a parent transition for orchestrated state (e.g.
 * when multiple actions share one transition). Pass nothing for the
 * common "fire and forget" case.
 *
 * Three tones:
 *
 *   neutral (default) — zinc glass surface, used for inspect/duplicate
 *   primary           — brand-tinted, used for confirmation actions
 *   danger            — red-tinted, used for suspend/disable/delete
 *
 * Sizes follow the platform's chrome density: `sm` (table-row), `md` (sheet footer).
 */

export type InlineActionTone = 'neutral' | 'primary' | 'danger';

const TONE: Record<InlineActionTone, string> = {
  neutral:
    'border-zinc-200/55 bg-white/65 text-zinc-700 hover:border-zinc-300/70 hover:bg-white hover:text-zinc-900 active:scale-[0.97] dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-300 dark:hover:border-zinc-700/70 dark:hover:bg-zinc-900 dark:hover:text-zinc-100',
  primary:
    'border-brand-200/70 bg-brand-50/70 text-brand-700 hover:border-brand-300/70 hover:bg-brand-50 active:scale-[0.97] dark:border-brand-800/55 dark:bg-brand-900/25 dark:text-brand-300 dark:hover:border-brand-700/70 dark:hover:bg-brand-900/40',
  danger:
    'border-red-200/70 bg-red-50/70 text-red-700 hover:border-red-300/70 hover:bg-red-50 active:scale-[0.97] dark:border-red-800/55 dark:bg-red-900/25 dark:text-red-300 dark:hover:border-red-700/70 dark:hover:bg-red-900/40',
};

const SIZE: Record<'sm' | 'md', string> = {
  sm: 'h-7 gap-1 px-2 text-[11px]',
  md: 'h-9 gap-1.5 px-3 text-xs',
};

interface InlineActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  tone?: InlineActionTone;
  size?: 'sm' | 'md';
  pending?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export const InlineAction = forwardRef<HTMLButtonElement, InlineActionProps>(
  function InlineAction({tone = 'neutral', size = 'sm', pending, icon, children, disabled, className, ...rest}, ref) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || pending}
        className={cn(
          'inline-flex items-center justify-center rounded-md border font-semibold backdrop-blur-sm transition-soft shadow-soft',
          'disabled:cursor-not-allowed disabled:opacity-50',
          TONE[tone],
          SIZE[size],
          className,
        )}
        {...rest}
      >
        {pending ? <Spinner size={size === 'sm' ? 10 : 12} className="text-current" /> : icon}
        <span className="truncate">{children}</span>
      </button>
    );
  },
);
