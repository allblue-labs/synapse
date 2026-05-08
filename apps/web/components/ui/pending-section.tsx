import {Construction} from 'lucide-react';
import type {ReactNode} from 'react';
import {PageHeader} from './page-header';

/**
 * Reusable scaffold for routes that exist in the IA but whose rich
 * operational UX is still being built.
 *
 * Renders a real PageHeader (so navigation/breadcrumbs work) plus a
 * dashed-outline placeholder card calling out the deferred scope.
 *
 * Pages that use this should swap it out for the real implementation
 * in a subsequent batch — never leave production traffic on a stub.
 */
export interface PendingSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** What the real UI will deliver, in 2–4 short bullets. */
  whatsComing?: ReadonlyArray<string>;
  /** Optional callout badge (e.g. "Stage 1B"). */
  trackingTag?: string;
  /** Optional accent color tokens for the header tile. */
  iconGradient?: string;
  glowColor?: string;
  icon?: ReactNode;
}

export function PendingSection({
  eyebrow,
  title,
  description,
  whatsComing,
  trackingTag,
  iconGradient = 'from-zinc-700 to-zinc-500',
  glowColor = 'bg-zinc-500/15',
  icon,
}: PendingSectionProps) {
  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        icon={icon ?? <Construction size={26} />}
        iconGradient={iconGradient}
        glowColor={glowColor}
        actions={
          trackingTag
            ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-400">
                {trackingTag}
              </span>
            )
            : undefined
        }
      />

      <section className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-white/40 p-10 dark:border-zinc-800/70 dark:bg-zinc-900/40">
        <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-40" />
        <div className="relative max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Pending — operational UX in progress
          </p>
          <h2 className="mt-2 text-base font-semibold tracking-tight text-zinc-700 dark:text-zinc-300">
            This surface is part of the IA but still being built.
          </h2>
          {whatsComing && whatsComing.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {whatsComing.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="shrink-0 text-zinc-300 dark:text-zinc-700">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
