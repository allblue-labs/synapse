import {cn} from '@/lib/utils';

/**
 * StatusPill — tone-aware state indicator for operational tables.
 *
 * One source of truth for the platform's state vocabulary so every
 * directory (Tenants, Modules, Integrations, Runtime) reads with the
 * same colour grammar:
 *
 *   tone="emerald"  →  Active / Healthy / Live / GA
 *   tone="amber"    →  Pending / Pilot / Trialing / Degraded
 *   tone="red"      →  Failed / Outage / Past due
 *   tone="violet"   →  Draft / Beta
 *   tone="zinc"     →  Inactive / Disabled / Unknown
 *
 * Pass `pulse` to add a breathing dot for realtime/in-flight states.
 */

export type StatusTone = 'emerald' | 'amber' | 'red' | 'violet' | 'sky' | 'indigo' | 'zinc';

const TONE: Record<StatusTone, {chip: string; dot: string}> = {
  emerald: {
    chip: 'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/55 dark:bg-emerald-900/25 dark:text-emerald-300',
    dot:  'bg-emerald-500',
  },
  amber: {
    chip: 'border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-800/55 dark:bg-amber-900/25 dark:text-amber-300',
    dot:  'bg-amber-500',
  },
  red: {
    chip: 'border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-800/55 dark:bg-red-900/25 dark:text-red-300',
    dot:  'bg-red-500',
  },
  violet: {
    chip: 'border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-800/55 dark:bg-violet-900/25 dark:text-violet-300',
    dot:  'bg-violet-500',
  },
  sky: {
    chip: 'border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-800/55 dark:bg-sky-900/25 dark:text-sky-300',
    dot:  'bg-sky-500',
  },
  indigo: {
    chip: 'border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-800/55 dark:bg-indigo-900/25 dark:text-indigo-300',
    dot:  'bg-indigo-500',
  },
  zinc: {
    chip: 'border-zinc-200/70 bg-white/60 text-zinc-600 dark:border-zinc-700/55 dark:bg-zinc-800/55 dark:text-zinc-400',
    dot:  'bg-zinc-400',
  },
};

interface StatusPillProps {
  tone: StatusTone;
  /** Display label. Keep short — these live in dense table cells. */
  label: string;
  /** When true, render a small breathing dot to signal a realtime/live state. */
  pulse?: boolean;
  /** Compact variant — smaller padding, used inside table cells. */
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusPill({tone, label, pulse, size = 'md', className}: StatusPillProps) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-[0.12em]',
        size === 'sm'
          ? 'px-1.5 py-0 text-[9px]'
          : 'px-2 py-0.5 text-[10px]',
        t.chip,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          t.dot,
          pulse && 'animate-pulse-dot',
        )}
      />
      {label}
    </span>
  );
}
