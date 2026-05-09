import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Boxes,
  Inbox,
  Megaphone,
  Plug,
  Settings2,
  Sparkles,
  Ticket,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {loadInboxLanes} from '@/lib/pulse/loaders';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Pulse'};

/**
 * Pulse module overview — entry point for the operational workspace.
 *
 *   - Translucent hero with live ops counters (no boxy header card).
 *   - Pipeline strip — keep (5 steps explain Pulse's job at a glance).
 *   - Asymmetric surface clusters: "Live operations" (one big, three rail
 *     tiles) then "Build & configure" (four smaller tiles). Replaces the
 *     old 11-cards-in-a-grid template feel.
 */

interface PulseSurface {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: 'brand' | 'indigo' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose' | 'blue' | 'red' | 'zinc';
  state: 'live' | 'pending';
}

const ACCENT: Record<PulseSurface['accent'], {iconBg: string; halo: string}> = {
  brand:   {iconBg: 'bg-brand-500/15 text-brand-700 dark:text-brand-300',     halo: 'from-brand-500/20 via-brand-500/5 to-transparent'},
  indigo:  {iconBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',  halo: 'from-indigo-500/20 via-indigo-500/5 to-transparent'},
  amber:   {iconBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',     halo: 'from-amber-500/20 via-amber-500/5 to-transparent'},
  emerald: {iconBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', halo: 'from-emerald-500/20 via-emerald-500/5 to-transparent'},
  sky:     {iconBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',           halo: 'from-sky-500/20 via-sky-500/5 to-transparent'},
  violet:  {iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',  halo: 'from-violet-500/20 via-violet-500/5 to-transparent'},
  rose:    {iconBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',        halo: 'from-rose-500/20 via-rose-500/5 to-transparent'},
  blue:    {iconBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',        halo: 'from-blue-500/20 via-blue-500/5 to-transparent'},
  red:     {iconBg: 'bg-red-500/15 text-red-700 dark:text-red-300',           halo: 'from-red-500/20 via-red-500/5 to-transparent'},
  zinc:    {iconBg: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',        halo: 'from-zinc-500/15 via-zinc-500/5 to-transparent'},
};

const LIVE_OPS: ReadonlyArray<PulseSurface> = [
  {key: 'inbox',    label: 'Inbox',     description: 'Operator queue: status, skill classification, confidence, escalations and pending reviews.',                href: '/workspace/modules/pulse/inbox',    icon: Inbox,    accent: 'brand',  state: 'live'},
  {key: 'tickets',  label: 'Tickets',   description: 'Ticket lifecycle across types — support, sales, scheduling, marketing, operator review.',                  href: '/workspace/modules/pulse/tickets',  icon: Ticket,   accent: 'indigo', state: 'pending'},
  {key: 'timeline', label: 'Timeline',  description: 'Real-time feed of operational events: AI decisions, workflow transitions, human reviews.',                 href: '/workspace/modules/pulse/timeline', icon: Activity, accent: 'emerald', state: 'pending'},
  {key: 'logs',     label: 'Logs',      description: 'Inspect items that failed processing. Retry, reassign or dismiss with full audit trails.',                 href: '/workspace/modules/pulse/logs',     icon: Activity, accent: 'red',    state: 'live'},
];

const BUILD_AND_CONFIGURE: ReadonlyArray<PulseSurface> = [
  {key: 'playbooks',    label: 'Playbooks',    description: 'Visual guided operational flows — define how AI agents and humans collaborate per skill.', href: '/workspace/modules/pulse/playbooks',    icon: Workflow,  accent: 'amber',  state: 'pending'},
  {key: 'knowledge',    label: 'Knowledge',    description: 'FAQs, business descriptions, operational instructions, products and services.',           href: '/workspace/modules/pulse/knowledge',    icon: BookOpen,  accent: 'sky',    state: 'pending'},
  {key: 'catalog',      label: 'Catalog',      description: 'Products and services Pulse can quote, recommend and sell inside conversations.',          href: '/workspace/modules/pulse/catalog',      icon: Boxes,     accent: 'violet', state: 'pending'},
  {key: 'campaigns',    label: 'Campaigns',    description: 'Outbound operational campaigns: promotions, scheduled outreach and marketing flows.',      href: '/workspace/modules/pulse/campaigns',    icon: Megaphone, accent: 'rose',   state: 'pending'},
  {key: 'integrations', label: 'Integrations', description: 'Calendars, CRMs and scheduling providers Pulse plugs into to take real-world actions.',     href: '/workspace/modules/pulse/integrations', icon: Plug,      accent: 'blue',   state: 'pending'},
  {key: 'metrics',      label: 'Metrics',      description: 'Conversation volume, resolution rate, escalations, response time and AI usage.',           href: '/workspace/modules/pulse/metrics',      icon: BarChart3, accent: 'emerald', state: 'pending'},
  {key: 'settings',     label: 'Settings',     description: 'Confidence thresholds, channel & calendar wiring, escalation rules.',                       href: '/workspace/modules/pulse/settings',     icon: Settings2, accent: 'zinc',   state: 'live'},
];

const PIPELINE = [
  {label: 'Inbound message',    icon: Inbox,        accent: 'brand'   as const},
  {label: 'AI extraction',      icon: Sparkles,     accent: 'violet'  as const},
  {label: 'Skill routing',      icon: Workflow,     accent: 'amber'   as const},
  {label: 'Operator review',    icon: Ticket,       accent: 'indigo'  as const},
  {label: 'Operational action', icon: ArrowUpRight, accent: 'emerald' as const},
] as const;

export default async function PulseOverviewPage() {
  const lanes = await loadInboxLanes();
  const live = lanes.kind === 'ok' ? lanes.data : null;
  const needsReview = live?.needsReview.length ?? 0;
  const inFlow      = live?.open.length        ?? 0;
  const waiting     = live?.waiting.length     ?? 0;
  const totalLive   = needsReview + inFlow + waiting;

  return (
    <div className="space-y-12">
      <Hero needsReview={needsReview} inFlow={inFlow} waiting={waiting} totalLive={totalLive} />

      {/* ── Pipeline ───────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <p className="section-eyebrow">Pipeline</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            How Pulse processes work
          </h2>
        </div>

        <div className="surface-translucent relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-50" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-brand-500/10 to-transparent animate-sweep" />

          <div className="relative hidden lg:block">
            <div className="absolute left-[8%] right-[8%] top-7 h-px bg-gradient-to-r from-brand-300 via-zinc-200 to-emerald-300 dark:from-brand-700 dark:via-zinc-700 dark:to-emerald-700" />
            <ol className="relative grid grid-cols-5 gap-3">
              {PIPELINE.map(({label, icon: Icon, accent}, idx) => (
                <li key={label} className="flex flex-col items-center text-center">
                  <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-soft ring-4 ring-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:ring-zinc-900`}>
                    <Icon size={20} className={ACCENT[accent].iconBg.split(' ').slice(1).join(' ')} />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                      {idx + 1}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {label}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <ol className="relative space-y-3 lg:hidden">
            {PIPELINE.map(({label, icon: Icon}, idx) => (
              <li key={label} className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-soft dark:border-zinc-700 dark:bg-zinc-800">
                  <Icon size={16} />
                </div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  <span className="mr-2 text-zinc-400">{idx + 1}.</span>
                  {label}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Live operations cluster ────────────────────────── */}
      <section>
        <RailHeader eyebrow="Live operations" title="Where the work happens" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Featured: Inbox */}
          <FeaturedSurface
            href="/workspace/modules/pulse/inbox"
            icon={Inbox}
            accent="brand"
            label="Inbox"
            description="Operator queue. Triage what needs review; let the AI run the rest."
            stat={totalLive}
            statLabel="live"
            sub={[
              {label: 'Needs review', value: needsReview},
              {label: 'In flow',      value: inFlow},
              {label: 'Waiting',      value: waiting},
            ]}
          />
          {/* Three small rail tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {LIVE_OPS.filter((s) => s.key !== 'inbox').map((s) => <RailSurface key={s.key} surface={s} />)}
          </div>
        </div>
      </section>

      {/* ── Build & configure cluster ──────────────────────── */}
      <section>
        <RailHeader eyebrow="Build & configure" title="Tune Pulse to your operation" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {BUILD_AND_CONFIGURE.map((s) => <CompactSurface key={s.key} surface={s} />)}
        </div>
      </section>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero({needsReview, inFlow, waiting, totalLive}: {needsReview: number; inFlow: number; waiting: number; totalLive: number}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-soft dark:border-zinc-800/70 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-12 -top-32 h-[360px] w-[360px] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            Module · Pulse
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-zinc-50 sm:text-[2.25rem]">
            Operational comms, in motion.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Pulse routes inbound items through AI extraction, applies the right skill, and hands off to humans only where it adds value.
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
            <Link href="/workspace/modules/pulse/playbooks" className="btn-ghost h-10 px-4">
              <Workflow size={14} />
              Playbooks
            </Link>
          </div>
        </div>

        {/* Hero stat cluster */}
        <div className="grid grid-cols-2 gap-3">
          <HeroStat label="Live items"    value={totalLive}   tone="brand"   icon={<Activity size={13} />} stripes={totalLive > 0} />
          <HeroStat label="Needs review"  value={needsReview} tone="amber"   icon={<Inbox size={13} />} />
          <HeroStat label="In flow"       value={inFlow}      tone="emerald" icon={<Workflow size={13} />} />
          <HeroStat label="Waiting"       value={waiting}     tone="zinc"    icon={<Sparkles size={13} />} />
        </div>
      </div>
    </section>
  );
}

const HERO_TONE: Record<'brand' | 'amber' | 'emerald' | 'zinc', {text: string; bg: string}> = {
  brand:   {text: 'text-brand-700 dark:text-brand-300',     bg: 'from-brand-500/15 to-brand-500/0'},
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  zinc:    {text: 'text-zinc-800 dark:text-zinc-200',       bg: 'from-zinc-500/10 to-zinc-500/0'},
};

function HeroStat({label, value, tone, icon, stripes}: {label: string; value: number; tone: keyof typeof HERO_TONE; icon: React.ReactNode; stripes?: boolean}) {
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

// ─── Featured surface (left, large) ─────────────────────────────────

function FeaturedSurface({
  href,
  icon: Icon,
  accent,
  label,
  description,
  stat,
  statLabel,
  sub,
}: {
  href: string;
  icon: LucideIcon;
  accent: PulseSurface['accent'];
  label: string;
  description: string;
  stat: number;
  statLabel: string;
  sub: ReadonlyArray<{label: string; value: number}>;
}) {
  const a = ACCENT[accent];
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/65 p-6 backdrop-blur-xl shadow-soft transition-all duration-200 ease-snap hover:-translate-y-[2px] hover:border-brand-200/80 hover:shadow-card dark:border-zinc-800/70 dark:bg-zinc-900/55 dark:hover:border-brand-800/60"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.halo} opacity-80`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative flex items-start justify-between">
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${a.iconBg}`}>
          <Icon size={20} />
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
      </div>

      <div className="relative mt-6 flex-1">
        <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{label}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>

      <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800/60">
        <div className="col-span-3 sm:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">{statLabel}</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">{stat}</p>
        </div>
        {sub.map(({label, value}) => (
          <div key={label} className="rounded-lg border border-zinc-200/60 bg-white/60 px-3 py-2 dark:border-zinc-800/60 dark:bg-zinc-900/50">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{label}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-200">{value}</p>
          </div>
        ))}
      </div>

      <ArrowUpRight size={16} className="row-arrow absolute right-5 top-5" />
    </Link>
  );
}

// ─── Rail surface (right, compact) ──────────────────────────────────

function RailSurface({surface}: {surface: PulseSurface}) {
  const a = ACCENT[surface.accent];
  const Icon = surface.icon;
  return (
    <Link
      href={surface.href}
      className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/65 p-4 backdrop-blur-xl shadow-soft transition-all duration-200 ease-snap hover:-translate-y-[2px] hover:border-brand-200/80 hover:shadow-card dark:border-zinc-800/70 dark:bg-zinc-900/55 dark:hover:border-brand-800/60"
    >
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r ${a.halo} opacity-50 transition-opacity duration-300 group-hover:opacity-100`} />
      <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
        <Icon size={15} />
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{surface.label}</p>
          <StateChip state={surface.state} />
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500 line-clamp-2">{surface.description}</p>
      </div>
      <ArrowUpRight size={14} className="row-arrow shrink-0" />
    </Link>
  );
}

// ─── Compact surface (Build & configure cluster) ────────────────────

function CompactSurface({surface}: {surface: PulseSurface}) {
  const a = ACCENT[surface.accent];
  const Icon = surface.icon;
  return (
    <Link
      href={surface.href}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200/70 bg-white/55 p-4 backdrop-blur-xl transition-all duration-200 ease-snap hover:-translate-y-[2px] hover:border-brand-200/80 hover:shadow-card dark:border-zinc-800/70 dark:bg-zinc-900/45 dark:hover:border-brand-800/60"
    >
      <div className={`pointer-events-none absolute -bottom-12 -right-10 h-24 w-24 rounded-full bg-gradient-to-tr ${a.halo} opacity-70 transition-opacity duration-300 group-hover:opacity-100`} />

      <div className="relative flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
          <Icon size={15} />
        </span>
        <StateChip state={surface.state} />
      </div>

      <div className="relative mt-4">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{surface.label}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">{surface.description}</p>
      </div>

      <div className="relative mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800/60">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-500">Open</span>
        <ArrowUpRight size={12} className="row-arrow" />
      </div>
    </Link>
  );
}

function StateChip({state}: {state: PulseSurface['state']}) {
  if (state === 'live') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/80 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-400">
      Stage 1B
    </span>
  );
}

// ─── Misc ────────────────────────────────────────────────────────────

function RailHeader({eyebrow, title}: {eyebrow: string; title: string}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
      </div>
    </div>
  );
}
