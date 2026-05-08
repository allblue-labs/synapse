import {cn} from '@/lib/utils';

/**
 * ConfidenceMeter — pill + bar variants for AI confidence (0..1).
 *
 * Bands (driven by the same thresholds used to gate auto-approve):
 *   high    ≥ 0.85   emerald
 *   medium  0.65–0.84 amber
 *   low     < 0.65    red
 */

export interface ConfidenceMeterProps {
  /** 0..1. Values outside this range are clamped. */
  value: number;
  /** Display variant. `inline` is for table rows, `block` for detail panels. */
  variant?: 'inline' | 'block';
  /** Tucks the confidence value beneath a small label (block variant only). */
  label?: string;
  className?: string;
}

interface Band {
  key: 'high' | 'medium' | 'low';
  label: string;
  text: string;
  bg: string;
  bar: string;
  border: string;
}

function bandFor(value: number): Band {
  if (value >= 0.85) {
    return {
      key: 'high',
      label: 'High',
      text: 'text-emerald-700 dark:text-emerald-400',
      bg:   'bg-emerald-50/80 dark:bg-emerald-900/30',
      bar:  'bg-emerald-500',
      border: 'border-emerald-200/80 dark:border-emerald-800/60',
    };
  }
  if (value >= 0.65) {
    return {
      key: 'medium',
      label: 'Medium',
      text: 'text-amber-700 dark:text-amber-400',
      bg:   'bg-amber-50/80 dark:bg-amber-900/30',
      bar:  'bg-amber-500',
      border: 'border-amber-200/80 dark:border-amber-800/60',
    };
  }
  return {
    key: 'low',
    label: 'Low',
    text: 'text-red-700 dark:text-red-400',
    bg:   'bg-red-50/80 dark:bg-red-900/30',
    bar:  'bg-red-500',
    border: 'border-red-200/80 dark:border-red-800/60',
  };
}

export function ConfidenceMeter({value, variant = 'inline', label, className}: ConfidenceMeterProps) {
  const v = Math.max(0, Math.min(1, value));
  const pct = Math.round(v * 100);
  const band = bandFor(v);

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
          band.text, band.bg, band.border,
          className,
        )}
        title={`${band.label} confidence — ${pct}%`}
      >
        <span className="relative inline-block h-1.5 w-8 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-700/50">
          <span
            className={cn('bar-progress absolute left-0 top-0 h-full', band.bar)}
            style={{['--w' as string]: `${pct}%`} as React.CSSProperties}
          />
        </span>
        {pct}%
      </span>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
          {label}
        </p>
      )}
      <div className="flex items-baseline gap-2">
        <span className={cn('text-2xl font-bold tabular-nums tracking-tight', band.text)}>
          {pct}%
        </span>
        <span className={cn('text-[11px] font-semibold uppercase tracking-widest', band.text)}>
          {band.label}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn('bar-progress absolute left-0 top-0 h-full transition-[width] duration-500', band.bar)}
          style={{['--w' as string]: `${pct}%`} as React.CSSProperties}
        />
      </div>
    </div>
  );
}
