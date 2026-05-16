'use client';

import {Check} from 'lucide-react';
import {SECTIONS, type SectionId, type SectionProgress} from '@/lib/onboarding/sections';
import {useTranslator} from '@/components/providers/locale-provider';
import {cn} from '@/lib/utils';

/**
 * SectionProgress — vertical operational timeline.
 *
 *   - One bullet per section (Business / Communication / Operational).
 *   - Three states: complete (check), active (filled dot + label glow),
 *     pending (hollow). Animated transitions use Stage-3 motion tokens.
 *   - Rendered on every onboarding screen for orientation.
 */

export interface SectionProgressProps {
  progress: ReadonlyArray<SectionProgress>;
  activeSection?: SectionId | null;
  className?: string;
}

export function SectionProgressTimeline({progress, activeSection, className}: SectionProgressProps) {
  const t = useTranslator();
  const totalDone = progress.reduce((s, p) => s + p.done, 0);
  const totalAll  = progress.reduce((s, p) => s + p.total, 0);

  return (
    <aside className={cn('surface-translucent relative flex h-full flex-col overflow-hidden p-6', className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative">
        <p className="section-eyebrow">{t('onboarding.eyebrow')}</p>
        <h2 className="t-h3 mt-1">{t('onboarding.progress.title')}</h2>
        <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
          <span className="font-mono tabular-nums">{totalDone}/{totalAll}</span>
          <span>·</span>
          <span>{t('onboarding.progress.completed')}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200/60 dark:bg-zinc-800/60">
          <div
            className="bar-progress h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500 ease-snap"
            style={{['--w' as string]: totalAll === 0 ? '0%' : `${Math.round((totalDone / totalAll) * 100)}%`} as React.CSSProperties}
          />
        </div>
      </div>

      <ol className="relative mt-6 space-y-3">
        {/* Vertical rail */}
        <span aria-hidden="true" className="absolute left-[14px] top-2 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-brand-500/40 via-zinc-200 to-zinc-200/40 dark:from-brand-500/40 dark:via-zinc-800 dark:to-zinc-800/40" />

        {SECTIONS.map((s) => {
          const p = progress.find((x) => x.id === s.id);
          const done = p?.done ?? 0;
          const total = p?.total ?? s.fields.length;
          const complete = p?.complete ?? false;
          const isActive = activeSection === s.id && !complete;

          return (
            <li key={s.id} className="relative flex items-start gap-3 pl-1">
              <span
                className={cn(
                  'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-snap',
                  complete
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : isActive
                      ? 'border-brand-500/55 bg-brand-500/15 text-brand-700 ring-2 ring-brand-500/15 dark:text-brand-300'
                      : 'border-zinc-300/55 bg-white/55 text-zinc-400 dark:border-zinc-700/55 dark:bg-zinc-900/45 dark:text-zinc-600',
                )}
              >
                {complete
                  ? <Check size={13} />
                  : isActive
                    ? <span className="block h-2 w-2 rounded-full bg-brand-500 animate-pulse-dot" />
                    : <span className="block h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    'text-[13px] font-semibold tracking-tight transition-colors duration-300',
                    complete
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : isActive
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-500 dark:text-zinc-500',
                  )}
                >
                  {t(`onboarding.sections.${s.labelKey}`)}
                </p>
                <p className="mt-0.5 font-mono text-[10px] tabular-nums text-zinc-400 dark:text-zinc-600">
                  {done}/{total}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="relative mt-auto pt-6 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
        <p>{t('onboarding.intro.legal')}</p>
      </div>
    </aside>
  );
}
