import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';

interface PageHeaderProps {
  /** Small uppercase eyebrow line above the title */
  eyebrow?: string;
  /** Main heading */
  title: string;
  /** Description below the title */
  description?: string;
  /** Optional icon shown in a gradient tile to the left of the heading */
  icon?: ReactNode;
  /** Tailwind classes for the icon-tile gradient (e.g. "from-blue-500 to-cyan-500") */
  iconGradient?: string;
  /** Trailing content (CTAs, status pills, etc.) — top-right on wide screens */
  actions?: ReactNode;
  /** Color of the orb behind the card. Provide a tailwind bg color like "bg-emerald-500/15" */
  glowColor?: string;
  className?: string;
}

/**
 * Shared page header for dashboard pages.
 * Carries the brand identity: subtle grid + soft glow orb + clean card frame.
 * Use this for every primary page header to keep visual rhythm consistent.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  iconGradient = 'from-brand-500 to-accent-500',
  actions,
  glowColor = 'bg-brand-500/15',
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-80" />
      <div className={cn('pointer-events-none absolute -right-16 -top-20 h-[280px] w-[280px] rounded-full blur-3xl', glowColor)} />

      <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-5">
          {icon && (
            <div className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-soft ring-1 ring-black/5 dark:ring-white/10',
              iconGradient,
            )}>
              {icon}
            </div>
          )}
          <div>
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[1.75rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
