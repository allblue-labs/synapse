import {cn} from '@/lib/utils';
import type {HTMLAttributes} from 'react';

type BadgeVariant =
  | 'default'
  | 'processing'
  | 'pending'
  | 'ready'
  | 'scheduled'
  | 'failed'
  | 'active'
  | 'inactive';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  processing:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pending:
    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ready:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  scheduled:
    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed:
    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  active:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive:
    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

export function Badge({className, variant = 'default', ...props}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
