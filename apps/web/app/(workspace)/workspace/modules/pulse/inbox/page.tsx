import Link from 'next/link';
import {ArrowUpRight, Inbox, Sparkles, Workflow, TimerReset, ShieldAlert} from 'lucide-react';
import {LoadState} from '@/components/ui/load-state';
import {ConfidenceMeter} from '@/components/pulse/confidence-meter';
import {
  ChannelPill,
  EscalationBadge,
  PriorityPill,
  SkillPill,
  TicketStatusPill,
} from '@/components/pulse/status-pills';
import {loadInboxLanes} from '@/lib/pulse/loaders';
import type {PulseTicketRow} from '@/lib/pulse/types';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Inbox — Pulse'};

/**
 * Pulse Inbox — air-traffic control for inbound work.
 *
 *   - Hero strip with live counters + queue health, *not* a boxy header card.
 *   - Asymmetric grid: dense operator queue on the left (the only lane that
 *     needs a human), passive lanes (in-flow, waiting) collapse to a tighter
 *     right rail so the operator's eye lives on what matters.
 *   - Honest empty / forbidden / error states. No invented numbers.
 */

function ageOf(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1)  return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default async function PulseInboxPage() {
  const result = await loadInboxLanes();

  if (result.kind === 'forbidden') {
    return (
      <div className="space-y-8">
        <Hero
          needsReview={0}
          inFlow={0}
          waiting={0}
          autoRate={null}
          dim
        />
        <LoadState
          variant="forbidden"
          title="You don’t have permission to view the inbox."
          description="The inbox requires the tickets:read permission. Ask an admin to grant it."
        />
      </div>
    );
  }

  if (result.kind === 'error') {
    return (
      <div className="space-y-8">
        <Hero
          needsReview={0}
          inFlow={0}
          waiting={0}
          autoRate={null}
          dim
        />
        <LoadState
          variant="error"
          title="We couldn’t load the inbox right now."
          description={`The Pulse API returned ${result.status || 'a network error'}: ${result.message}`}
        />
      </div>
    );
  }

  if (result.kind === 'not_found') {
    return (
      <div className="space-y-8">
        <Hero needsReview={0} inFlow={0} waiting={0} autoRate={null} dim />
        <LoadState
          variant="empty"
          title="No inbox available."
          description="The Pulse inbox endpoint returned not found for this tenant."
        />
      </div>
    );
  }

  const {needsReview, open, waiting} = result.data;
  const total = needsReview.length + open.length + waiting.length;
  const autoRate = total === 0 ? null : Math.round((open.length / Math.max(total, 1)) * 100);

  return (
    <div className="space-y-10">
      <Hero
        needsReview={needsReview.length}
        inFlow={open.length}
        waiting={waiting.length}
        autoRate={autoRate}
      />

      {/* ── Asymmetric layout: operator queue takes 2/3, passive lanes 1/3 ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PrimaryLane rows={needsReview} />
        <div className="space-y-6">
          <SecondaryLane
            eyebrow="In flow"
            title="AI is handling these"
            description="Watch passively. Step in only if you spot something worth correcting."
            icon={<Workflow size={13} />}
            tone="brand"
            emptyHint="No live items right now."
            rows={open}
          />
          <SecondaryLane
            eyebrow="Watching"
            title="Waiting on customer"
            description="Reply pending. Pulse will continue the playbook when they respond."
            icon={<TimerReset size={13} />}
            tone="zinc"
            emptyHint="No items waiting on customers."
            rows={waiting}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Hero strip ──────────────────────────────────────────────────────

function Hero({
  needsReview,
  inFlow,
  waiting,
  autoRate,
  dim,
}: {
  needsReview: number;
  inFlow: number;
  waiting: number;
  autoRate: number | null;
  dim?: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-soft dark:border-zinc-800/70 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-16 -top-24 h-[300px] w-[300px] rounded-full bg-amber-500/12 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-[-6rem] h-[260px] w-[260px] rounded-full bg-brand-500/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            Pulse · operator queue
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-zinc-50">
            Inbox.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Triage what needs operator attention. The AI handles low-confidence items by
            requesting a human; everything else flows through automatically.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <Link href="/workspace/modules/pulse/tickets" className="btn-secondary h-9 px-3 text-xs">
              Search tickets
              <ArrowUpRight size={12} />
            </Link>
            <Link href="/workspace/modules/pulse/timeline" className="btn-ghost h-9 px-3 text-xs">
              Open timeline
            </Link>
          </div>
        </div>

        {/* Hero stats — 2x2 dock cluster, dim if data unavailable */}
        <div className={`grid grid-cols-2 gap-3 ${dim ? 'opacity-60' : ''}`}>
          <HeroStat label="Needs review"   value={needsReview} icon={<Inbox size={13} />}        tone="amber"   stripes={needsReview > 0} />
          <HeroStat label="In flow"        value={inFlow}      icon={<Workflow size={13} />}     tone="brand" />
          <HeroStat label="Waiting"        value={waiting}     icon={<TimerReset size={13} />}   tone="zinc" />
          <HeroStat label="Auto-handle"    value={autoRate == null ? '—' : `${autoRate}%`} icon={<Sparkles size={13} />} tone="emerald" />
        </div>
      </div>
    </section>
  );
}

const HERO_TONE: Record<'amber' | 'brand' | 'zinc' | 'emerald', {text: string; bg: string}> = {
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
  brand:   {text: 'text-brand-700 dark:text-brand-300',     bg: 'from-brand-500/15 to-brand-500/0'},
  zinc:    {text: 'text-zinc-800 dark:text-zinc-200',       bg: 'from-zinc-500/10 to-zinc-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
};

function HeroStat({
  label,
  value,
  icon,
  tone,
  stripes,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: keyof typeof HERO_TONE;
  stripes?: boolean;
}) {
  const t = HERO_TONE[tone];
  return (
    <div className="surface-dock relative overflow-hidden p-4">
      {stripes && <div aria-hidden="true" className="pointer-events-none absolute inset-0 stripes-pulse opacity-30" />}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b ${t.bg} opacity-70`} />
      <div className="relative flex items-start justify-between">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${t.bg} ${t.text}`}>
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{label}</span>
      </div>
      <p className={`relative mt-3 text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>{value}</p>
    </div>
  );
}

// ─── Primary lane: operator queue (the only lane that needs a human) ─

function PrimaryLane({rows}: {rows: ReadonlyArray<PulseTicketRow>}) {
  return (
    <section className="surface-translucent overflow-hidden">
      <div className="flex items-end justify-between gap-4 px-6 pt-6">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <ShieldAlert size={11} className="text-amber-600 dark:text-amber-400" />
            Operator queue
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {rows.length === 0
              ? 'Nothing in the queue.'
              : `${rows.length} ticket${rows.length === 1 ? '' : 's'} awaiting review`}
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
            The AI handed off because confidence dropped, a playbook step required a human, or a customer requested escalation.
          </p>
        </div>
        <span className="hidden text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-500 sm:inline">
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="m-6 mt-5 rounded-xl border border-dashed border-zinc-200 bg-white/40 p-10 text-center dark:border-zinc-800/70 dark:bg-zinc-900/30">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            All incoming items are within auto-handle confidence. The AI will surface anything worth your attention here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {rows.map((row, idx) => (
            <PrimaryRow key={row.id} row={row} index={idx} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PrimaryRow({row, index}: {row: PulseTicketRow; index: number}) {
  return (
    <li
      className="animate-slide-up"
      style={{animationDelay: `${Math.min(index, 6) * 30}ms`} as React.CSSProperties}
    >
      <Link
        href={`/workspace/modules/pulse/tickets/${row.id}`}
        className="group relative grid gap-4 px-6 py-4 transition-colors duration-150 ease-snap hover:bg-white/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 dark:hover:bg-zinc-900/60"
      >
        {/* Side accent bar — animates from 0% to 100% on hover */}
        <span
          aria-hidden="true"
          className="absolute inset-y-3 left-0 w-[3px] origin-top scale-y-0 rounded-r-full bg-gradient-to-b from-amber-500 to-brand-500 transition-transform duration-300 ease-snap group-hover:scale-y-100"
        />

        {/* Identity */}
        <div className="flex min-w-0 items-start gap-4">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-xs font-bold text-brand-700 ring-1 ring-brand-200/60 dark:text-brand-300 dark:ring-brand-800/60">
            {(row.customer.displayName ?? row.customer.handle).charAt(0).toUpperCase()}
            {row.escalated && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900">
                <span className="block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-white" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {row.customer.displayName ?? row.customer.handle}
              </span>
              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
                {row.id.slice(0, 12)}
              </span>
              {row.escalated && <EscalationBadge />}
            </div>
            {row.preview && (
              <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
                {row.preview}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <SkillPill skill={row.skill} />
              <ChannelPill channel={row.customer.channel} />
              <PriorityPill priority={row.priority} />
            </div>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-4 sm:gap-5">
          <TicketStatusPill status={row.status} />
          <ConfidenceMeter value={row.confidence} variant="inline" />
          <span className="hidden font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-500 sm:inline">
            {ageOf(row.updatedAt)}
          </span>
          <ArrowUpRight size={14} className="row-arrow" />
        </div>
      </Link>
    </li>
  );
}

// ─── Secondary lane (right rail, denser, less prominent) ─────────────

function SecondaryLane({
  eyebrow,
  title,
  description,
  icon,
  tone,
  emptyHint,
  rows,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: 'brand' | 'zinc';
  emptyHint: string;
  rows: ReadonlyArray<PulseTicketRow>;
}) {
  const accent = tone === 'brand'
    ? 'from-transparent via-brand-500/40 to-transparent'
    : 'from-transparent via-zinc-400/40 to-transparent';
  return (
    <section className="surface-rail relative overflow-hidden">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`} />

      <div className="px-5 pt-5">
        <p className="section-eyebrow flex items-center gap-2">
          <span className={tone === 'brand' ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-500'}>{icon}</span>
          {eyebrow}
        </p>
        <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">{description}</p>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-6 text-xs text-zinc-500 dark:text-zinc-500">{emptyHint}</div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {rows.slice(0, 6).map((row) => (
            <li key={row.id}>
              <Link
                href={`/workspace/modules/pulse/tickets/${row.id}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors duration-150 ease-snap hover:bg-white/50 dark:hover:bg-zinc-900/60"
              >
                <span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${tone === 'brand' ? 'bg-brand-500/70' : 'bg-zinc-400/70'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.customer.displayName ?? row.customer.handle}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-500">
                    {row.skill?.toString().toLowerCase() ?? row.type.toLowerCase()} · {row.priority.toLowerCase()}
                  </p>
                </div>
                <ConfidenceMeter value={row.confidence} variant="inline" />
                <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600">{ageOf(row.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 6 && (
        <div className="border-t border-zinc-100 px-5 py-2 text-[11px] text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-500">
          +{rows.length - 6} more · <Link href="/workspace/modules/pulse/tickets" className="font-medium text-brand-600 hover:underline dark:text-brand-400">view all</Link>
        </div>
      )}
    </section>
  );
}
