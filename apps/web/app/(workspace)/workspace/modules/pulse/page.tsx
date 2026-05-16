import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardList,
  Inbox,
  Megaphone,
  Plug,
  Settings2,
  Sparkles,
  Ticket,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {AnimatedNumber} from '@/components/ui/animated-number';
import {StatusPill} from '@/components/ui/status-pill';
import {loadInboxLanes, loadKnowledgeContexts} from '@/lib/pulse/loaders';
import type {PulseTicketRow} from '@/lib/pulse/types';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Pulse'};

/**
 * Pulse module — operational command surface.
 *
 *   - This is NOT a card grid (Stage 9 rule). It reads as a control
 *     surface: live queue snapshot, what-needs-attention pointer, the
 *     pipeline that explains the model, and a compact jump rail to the
 *     deep surfaces. Operators land here once per shift and use it as a
 *     dispatch view, not a homepage.
 *
 *   - Data comes from the existing Pulse loaders (no API change). When
 *     a loader fails, the corresponding panel renders an honest `—` /
 *     "not available right now" hint without taking down the page.
 */

// ─── Surfaces (for the jump rail) ───────────────────────────────────

interface Surface {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  state: 'live' | 'pending';
}

const SURFACES: ReadonlyArray<Surface> = [
  {href: '/workspace/modules/pulse/inbox',        icon: Inbox,         label: 'Inbox',         description: 'Operator queue and review backlog.',                          state: 'live'},
  {href: '/workspace/modules/pulse/tickets',      icon: Ticket,        label: 'Tickets',       description: 'Lifecycle search across types and statuses.',                state: 'live'},
  {href: '/workspace/modules/pulse/timeline',     icon: Sparkles,      label: 'Timeline',      description: 'Realtime feed of operational events.',                       state: 'pending'},
  {href: '/workspace/modules/pulse/playbooks',    icon: Workflow,      label: 'Playbooks',     description: 'Visual guided flows by skill.',                              state: 'pending'},
  {href: '/workspace/modules/pulse/knowledge',    icon: BookOpen,      label: 'Knowledge',     description: 'FAQs and grounding contexts.',                               state: 'live'},
  {href: '/workspace/modules/pulse/catalog',      icon: Boxes,         label: 'Catalog',       description: 'Products and services Pulse can quote.',                     state: 'pending'},
  {href: '/workspace/modules/pulse/campaigns',    icon: Megaphone,     label: 'Campaigns',     description: 'Outbound flows and promotions.',                             state: 'pending'},
  {href: '/workspace/modules/pulse/integrations', icon: Plug,          label: 'Integrations',  description: 'Channels, calendars, CRMs.',                                 state: 'pending'},
  {href: '/workspace/modules/pulse/metrics',      icon: BarChart3,     label: 'Metrics',       description: 'Volume, resolution, escalations, AI usage.',                 state: 'pending'},
  {href: '/workspace/modules/pulse/logs',         icon: Activity,      label: 'Logs',          description: 'Failed processing with retries and audit trails.',           state: 'live'},
  {href: '/workspace/modules/pulse/settings',     icon: Settings2,     label: 'Settings',      description: 'Confidence thresholds, wiring, escalation rules.',           state: 'live'},
];

// ─── Pipeline (the operating model — kept; this is not a card grid) ─

const PIPELINE = [
  {label: 'Inbound',  icon: Inbox,       tone: 'brand'   as const},
  {label: 'Extract',  icon: Sparkles,    tone: 'violet'  as const},
  {label: 'Route',    icon: Workflow,    tone: 'amber'   as const},
  {label: 'Review',   icon: Ticket,      tone: 'indigo'  as const},
  {label: 'Act',      icon: ArrowUpRight,tone: 'emerald' as const},
] as const;

// ─── Page ────────────────────────────────────────────────────────────

export default async function PulseLandingPage() {
  // Best-effort parallel fetches; failures don't take down the page.
  const [lanes, knowledge] = await Promise.all([
    loadInboxLanes(),
    loadKnowledgeContexts({pageSize: 1}),
  ]);

  const ok = lanes.kind === 'ok' ? lanes.data : null;
  const needsReview = ok?.needsReview.length ?? 0;
  const inFlow      = ok?.open.length        ?? 0;
  const waiting     = ok?.waiting.length     ?? 0;
  const totalLive   = needsReview + inFlow + waiting;

  // Top-priority "what needs attention" pointer — pick the urgent
  // escalation if there is one; otherwise the most recent needs-review;
  // otherwise null so the panel can render an honest empty state.
  const nextUp =
    (ok?.needsReview ?? []).find((t) => t.escalated)
    ?? (ok?.needsReview ?? [])[0]
    ?? null;

  const knowledgeTotal = knowledge.kind === 'ok' ? knowledge.data.facets.total : 0;

  return (
    <div className="stack-page">
      <Hero
        needsReview={needsReview}
        inFlow={inFlow}
        waiting={waiting}
        totalLive={totalLive}
        knowledgeTotal={knowledgeTotal}
      />

      <Pipeline />

      {/* ── 2-col operational block: what needs attention + queue snapshot ─ */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <NextUpPanel
          ticket={nextUp}
          inboxAvailable={lanes.kind === 'ok'}
          forbidden={lanes.kind === 'forbidden'}
        />
        <QueueSnapshot
          needsReview={needsReview}
          inFlow={inFlow}
          waiting={waiting}
          available={lanes.kind === 'ok'}
        />
      </div>

      <SurfaceRail />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero({
  needsReview,
  inFlow,
  totalLive,
  knowledgeTotal,
}: {
  needsReview: number;
  inFlow: number;
  waiting: number;
  totalLive: number;
  knowledgeTotal: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/55 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-glass dark:border-zinc-800/55 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25 dark:shadow-glass-dark">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-12 -top-32 h-[360px] w-[360px] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            Module · Pulse
          </p>
          <h1 className="t-h1 mt-3">Operational comms, in motion.</h1>
          <p className="t-body mt-3 max-w-lg">
            Pulse routes inbound items through AI extraction, applies the right skill,
            and hands off to humans only where it adds value. This page is your
            dispatch view — live queue, what needs attention next, where to jump.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href="/workspace/modules/pulse/inbox" className="btn-primary h-10 px-4">
              <Inbox size={14} />
              Open inbox
            </Link>
            <Link href="/workspace/modules/pulse/tickets" className="btn-secondary h-10 px-4">
              <Ticket size={14} />
              Search tickets
            </Link>
            <Link href="/workspace/modules/pulse/knowledge" className="btn-ghost h-10 px-4">
              <ClipboardList size={14} />
              Knowledge
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <HeroStat label="Live items"   value={totalLive}      tone="brand"   stripes={totalLive > 0} pulse />
          <HeroStat label="Needs review" value={needsReview}    tone="amber"   pulse={needsReview > 0} />
          <HeroStat label="In flow"      value={inFlow}         tone="emerald" />
          <HeroStat label="Knowledge"    value={knowledgeTotal} tone="sky" />
        </div>
      </div>
    </section>
  );
}

const HERO_TONE: Record<'brand' | 'amber' | 'emerald' | 'sky' | 'violet' | 'indigo' | 'zinc', {text: string; bg: string}> = {
  brand:   {text: 'text-brand-700 dark:text-brand-300',     bg: 'from-brand-500/15 to-brand-500/0'},
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  sky:     {text: 'text-sky-700 dark:text-sky-300',         bg: 'from-sky-500/15 to-sky-500/0'},
  violet:  {text: 'text-violet-700 dark:text-violet-300',   bg: 'from-violet-500/15 to-violet-500/0'},
  indigo:  {text: 'text-indigo-700 dark:text-indigo-300',   bg: 'from-indigo-500/15 to-indigo-500/0'},
  zinc:    {text: 'text-zinc-800 dark:text-zinc-200',       bg: 'from-zinc-500/10 to-zinc-500/0'},
};

function HeroStat({label, value, tone, stripes, pulse}: {label: string; value: number; tone: keyof typeof HERO_TONE; stripes?: boolean; pulse?: boolean}) {
  const t = HERO_TONE[tone];
  return (
    <div className="surface-dock relative overflow-hidden p-4">
      {stripes && <div aria-hidden="true" className="pointer-events-none absolute inset-0 stripes-pulse opacity-30" />}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b ${t.bg} opacity-70`} />
      <div className="relative flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{label}</span>
        {pulse && value > 0 && <span className="live-dot" aria-hidden="true" />}
      </div>
      <p className={`relative mt-2 text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

// ─── Pipeline ────────────────────────────────────────────────────────

function Pipeline() {
  return (
    <section className="surface-translucent relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-brand-500/10 to-transparent animate-sweep" />

      <div className="relative mb-5">
        <p className="section-eyebrow">Operating model</p>
        <h2 className="t-h3 mt-1">How Pulse processes work</h2>
      </div>

      <div className="relative hidden lg:block">
        <div className="absolute left-[8%] right-[8%] top-7 h-px bg-gradient-to-r from-brand-300 via-zinc-200 to-emerald-300 dark:from-brand-700 dark:via-zinc-700 dark:to-emerald-700" />
        <ol className="relative grid grid-cols-5 gap-3">
          {PIPELINE.map(({label, icon: Icon, tone}, idx) => {
            const t = HERO_TONE[tone];
            return (
              <li key={label} className="flex flex-col items-center text-center">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200/55 bg-white/85 shadow-soft ring-4 ring-white/50 backdrop-blur-xl dark:border-zinc-700/55 dark:bg-zinc-900/75 dark:ring-zinc-950/50">
                  <Icon size={20} className={t.text} />
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                    {idx + 1}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <ol className="relative space-y-3 lg:hidden">
        {PIPELINE.map(({label, icon: Icon, tone}, idx) => {
          const t = HERO_TONE[tone];
          return (
            <li key={label} className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200/55 bg-white/85 shadow-soft dark:border-zinc-700/55 dark:bg-zinc-900/75">
                <Icon size={16} className={t.text} />
              </div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                <span className="mr-2 text-zinc-400">{idx + 1}.</span>
                {label}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ─── What needs attention ────────────────────────────────────────────

function NextUpPanel({
  ticket,
  inboxAvailable,
  forbidden,
}: {
  ticket: PulseTicketRow | null;
  inboxAvailable: boolean;
  forbidden: boolean;
}) {
  return (
    <section className="surface-translucent relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <span className="live-dot" aria-hidden="true" />
            What needs attention
          </p>
          <h2 className="t-h3 mt-1">
            {ticket ? 'Operator next-up' : 'Queue is clean'}
          </h2>
        </div>
        <Link
          href="/workspace/modules/pulse/inbox"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Open inbox
          <ArrowRight size={11} />
        </Link>
      </div>

      {!inboxAvailable ? (
        <div className="mt-5 rounded-xl border border-dashed border-zinc-200/55 bg-white/40 p-5 text-[12px] text-zinc-500 dark:border-zinc-800/55 dark:bg-zinc-900/30 dark:text-zinc-500">
          {forbidden
            ? 'You don’t have permission to read the operator queue. Ask an admin for the tickets:read permission.'
            : 'Could not load the operator queue right now. Pulse keeps running; check back in a moment.'}
        </div>
      ) : ticket ? (
        <Link
          href={`/workspace/modules/pulse/tickets/${ticket.id}`}
          className="surface-inset surface-hover-brand group mt-5 flex items-start gap-4 p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-xs font-bold text-brand-700 ring-1 ring-brand-200/55 dark:text-brand-300 dark:ring-brand-800/55">
            {(ticket.customer.displayName ?? ticket.customer.handle).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="t-h3 leading-tight">
                {ticket.customer.displayName ?? ticket.customer.handle}
              </p>
              {ticket.escalated && <StatusPill tone="red" label="Escalated" pulse />}
            </div>
            {ticket.preview && (
              <p className="mt-1 line-clamp-2 text-[12px] text-zinc-600 dark:text-zinc-400">
                {ticket.preview}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusPill tone="amber" label="Needs review" />
              <StatusPill tone="zinc"  label={ticket.priority.toLowerCase()} />
              <span className="t-meta-xs">
                {ticket.type.toLowerCase().replace('_', ' ')}
              </span>
            </div>
          </div>
          <ArrowUpRight size={14} className="row-arrow" />
        </Link>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-emerald-200/55 bg-emerald-50/30 p-5 text-[12px] leading-relaxed text-emerald-800/80 dark:border-emerald-800/45 dark:bg-emerald-900/15 dark:text-emerald-300/80">
          Every inbound item is within auto-handle confidence. Pulse will surface
          anything worth your attention here in real time.
        </div>
      )}
    </section>
  );
}

// ─── Queue snapshot ──────────────────────────────────────────────────

function QueueSnapshot({
  needsReview,
  inFlow,
  waiting,
  available,
}: {
  needsReview: number;
  inFlow: number;
  waiting: number;
  available: boolean;
}) {
  return (
    <section className="surface-rail relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="flex items-end justify-between gap-3 px-5 pt-5">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            Queue snapshot
          </p>
          <h3 className="t-h3 mt-1">Pulse lanes</h3>
        </div>
      </div>

      <div className="space-y-2 px-3 py-4">
        <LaneRow label="Needs review" value={needsReview} tone="amber"   href="/workspace/modules/pulse/inbox" available={available} pulse />
        <LaneRow label="In flow"      value={inFlow}      tone="brand"   href="/workspace/modules/pulse/inbox" available={available} />
        <LaneRow label="Waiting"      value={waiting}     tone="zinc"    href="/workspace/modules/pulse/inbox" available={available} />
      </div>
    </section>
  );
}

function LaneRow({
  label,
  value,
  tone,
  href,
  available,
  pulse,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'brand' | 'zinc';
  href: string;
  available: boolean;
  pulse?: boolean;
}) {
  const t = HERO_TONE[tone];
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-soft hover:bg-white/55 dark:hover:bg-zinc-900/55"
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${t.bg}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${pulse && value > 0 ? 'bg-amber-500 animate-pulse-dot' : tone === 'brand' ? 'bg-brand-500' : 'bg-zinc-400'}`} />
      </span>
      <span className="flex-1 text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
      <span className={`text-base font-bold tabular-nums tracking-tight ${t.text}`}>
        {available ? <AnimatedNumber value={value} /> : '—'}
      </span>
      <ArrowUpRight size={12} className="row-arrow" />
    </Link>
  );
}

// ─── Surface rail (compact links, not a card grid) ──────────────────

function SurfaceRail() {
  const liveCount    = SURFACES.filter((s) => s.state === 'live').length;
  const pendingCount = SURFACES.filter((s) => s.state === 'pending').length;

  return (
    <section className="surface-translucent overflow-hidden">
      <div className="flex items-end justify-between gap-4 px-6 pb-3 pt-5">
        <div>
          <p className="section-eyebrow">Pulse surfaces</p>
          <h2 className="t-h3 mt-1">Jump to</h2>
        </div>
        <span className="t-meta-xs">
          {liveCount} live · {pendingCount} pending
        </span>
      </div>

      <div className="divide-y divide-zinc-200/55 dark:divide-zinc-800/55">
        {SURFACES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-center gap-4 px-6 py-3 transition-soft hover:bg-white/45 dark:hover:bg-zinc-900/45"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-zinc-800/70 dark:text-zinc-400 dark:group-hover:bg-brand-900/30 dark:group-hover:text-brand-300">
              <s.icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="t-h3 text-[13px] leading-tight">{s.label}</p>
              <p className="t-small mt-0.5 line-clamp-1">{s.description}</p>
            </div>
            {s.state === 'live'
              ? <StatusPill tone="emerald" label="Live" pulse />
              : <StatusPill tone="zinc" label="Pending" />}
            <ArrowUpRight size={13} className="row-arrow shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
