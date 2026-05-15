'use client';

import {useEffect, useState} from 'react';
import {cn} from '@/lib/utils';

/**
 * PeriodFilter — control-center window selector.
 *
 *   - Client component because the selection lives in state. No URL
 *     plumbing today (data is `—` everywhere) so the filter is purely
 *     visual until the platform metrics client lands.
 *   - Persists the last choice in `localStorage` so an operator's
 *     preferred window survives reloads.
 *   - When the real metrics surface ships, this becomes the seam that
 *     drives the loader's time-window param.
 */

export type Period = '1h' | '24h' | '7d' | '30d' | 'all';

const STORAGE_KEY = 'synapse.platform.period';

const OPTIONS: ReadonlyArray<{value: Period; label: string; hint: string}> = [
  {value: '1h',  label: '1h',  hint: 'Last hour'},
  {value: '24h', label: '24h', hint: 'Last day'},
  {value: '7d',  label: '7d',  hint: 'Last week'},
  {value: '30d', label: '30d', hint: 'Last 30 days'},
  {value: 'all', label: 'All', hint: 'All time'},
];

interface PeriodFilterProps {
  defaultPeriod?: Period;
  onChange?: (period: Period) => void;
  className?: string;
}

export function PeriodFilter({defaultPeriod = '24h', onChange, className}: PeriodFilterProps) {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && OPTIONS.some((o) => o.value === stored)) {
        setPeriod(stored as Period);
        onChange?.(stored as Period);
      }
    } catch {
      // localStorage may be unavailable.
    }
    setHydrated(true);
    // Intentionally exclude `onChange` from deps — we only want this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(next: Period) {
    setPeriod(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best effort.
    }
    onChange?.(next);
  }

  return (
    <div
      role="tablist"
      aria-label="Time window"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-zinc-200/55 bg-white/70 p-0.5 shadow-soft backdrop-blur dark:border-zinc-800/55 dark:bg-zinc-900/55',
        hydrated ? '' : 'opacity-90',
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === period;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            title={opt.hint}
            onClick={() => select(opt.value)}
            className={cn(
              'rounded-md px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-soft',
              active
                ? 'bg-gradient-to-b from-indigo-500/15 to-indigo-500/0 text-indigo-700 shadow-soft dark:from-indigo-500/20 dark:to-indigo-500/0 dark:text-indigo-300'
                : 'text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-200',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
