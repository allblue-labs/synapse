import Link from 'next/link';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  CheckCircle2,
  Cpu,
  CreditCard,
  Database,
  Flag,
  Gauge,
  HeartPulse,
  Plug,
  ShieldAlert,
  ShieldCheck,
  Timer,
  TimerReset,
  Workflow,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {AnimatedNumber} from '@/components/ui/animated-number';
import {PeriodFilter} from '@/components/platform/period-filter';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Platform Overview'};

/**
 * Platform admin overview — infra/control center.
 *
 *   - Hero strip with period filter (1h / 24h / 7d / 30d / All).
 *   - System health rail with latency, uptime, last-check per zone.
 *   - Success / failure operations strip.
 *   - Operational zones drilldown (Tenants / Runtime / Billing / Modules).
 *   - Runtime observability + System activity stream.
 *   - Shortcuts rail.
 *
 * No real platform metrics client is wired yet, so values render as `—`
 * with inline copy naming the backend dependency. The structure is in
 * place so when the data lands every cell has a home.
 */

// ─── Token palettes ─────────────────────────────────────────────────

const HERO_TONE: Record<'indigo' | 'violet' | 'sky' | 'emerald' | 'amber' | 'red', {text: string; bg: string}> = {
  indigo:  {text: 'text-indigo-700 dark:text-indigo-300',   bg: 'from-indigo-500/15 to-indigo-500/0'},
  violet:  {text: 'text-violet-700 dark:text-violet-300',   bg: 'from-violet-500/15 to-violet-500/0'},
  sky:     {text: 'text-sky-700 dark:text-sky-300',         bg: 'from-sky-500/15 to-sky-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
  red:     {text: 'text-red-700 dark:text-red-400',         bg: 'from-red-500/15 to-red-500/0'},
};

// ─── System health ──────────────────────────────────────────────────

type HealthState = 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'UNKNOWN';

interface ZoneHealth {
  label: string;
  service: string;
  state: HealthState;
  /** Latency hint (e.g. "p95 38ms"). `null` until metrics ship. */
  latency: string | null;
  /** Uptime over the current window (e.g. "99.95%"). `null` until metrics ship. */
  uptime: string | null;
}

const ZONES: ReadonlyArray<ZoneHealth> = [
  {label: 'API',      service: 'NestJS · /v1',         state: 'OPERATIONAL', latency: null, uptime: null},
  {label: 'Runtime',  service: 'Go runtime · proxied', state: 'OPERATIONAL', latency: null, uptime: null},
  {label: 'Queues',   service: 'BullMQ workers',       state: 'UNKNOWN',     latency: null, uptime: null},
  {label: 'Database', service: 'Prisma · Postgres',    state: 'OPERATIONAL', latency: null, uptime: null},
  {label: 'Stripe',   service: 'Webhook ingest',       state: 'UNKNOWN',     latency: null, uptime: null},
  {label: 'Audit',    service: 'Append-only ledger',   state: 'OPERATIONAL', latency: null, uptime: null},
];

const STATE_META: Record<HealthState, {label: string; tone: 'emerald' | 'amber' | 'red' | 'zinc'; icon: LucideIcon; pulse: boolean}> = {
  OPERATIONAL: {label: 'Operational', tone: 'emerald', icon: CheckCircle2, pulse: true},
  DEGRADED:    {label: 'Degraded',    tone: 'amber',   icon: AlertTriangle, pulse: true},
  OUTAGE:      {label: 'Outage',      tone: 'red',     icon: AlertOctagon, pulse: false},
  UNKNOWN:     {label: 'Unknown',     tone: 'zinc',    icon: TimerReset, pulse: false},
};

// ─── Operational zones (drilldown) ──────────────────────────────────

interface ZoneCard {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  primary: {value: number | null; label: string};
  secondary: ReadonlyArray<{value: number | null; label: string}>;
  accent: 'indigo' | 'violet' | 'emerald' | 'sky';
}

const ZONE_ACCENT: Record<ZoneCard['accent'], {iconBg: string; halo: string}> = {
  indigo:  {iconBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',     halo: 'from-indigo-500/20 via-indigo-500/5 to-transparent'},
  violet:  {iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',     halo: 'from-violet-500/20 via-violet-500/5 to-transparent'},
  emerald: {iconBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', halo: 'from-emerald-500/20 via-emerald-500/5 to-transparent'},
  sky:     {iconBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',             halo: 'from-sky-500/20 via-sky-500/5 to-transparent'},
};

const ZONE_CARDS: ReadonlyArray<ZoneCard> = [
  {
    href: '/platform/tenants',
    icon: Building2,
    label: 'Tenants',
    description: 'Active workspaces, suspended, pending setup.',
    primary:   {value: null, label: 'Active'},
    secondary: [{value: null, label: 'Suspended'}, {value: null, label: 'Pending'}],
    accent: 'indigo',
  },
  {
    href: '/platform/runtime',
    icon: Activity,
    label: 'Runtime',
    description: 'Worker health, queue depth, error rate.',
    primary:   {value: null, label: 'Workers'},
    secondary: [{value: null, label: 'Queue depth'}, {value: null, label: 'Errors / hr'}],
    accent: 'violet',
  },
  {
    href: '/platform/billing',
    icon: CreditCard,
    label: 'Billing',
    description: 'Subscriptions, invoices, Stripe webhook lag.',
    primary:   {value: null, label: 'MRR'},
    secondary: [{value: null, label: 'Customers'}, {value: null, label: 'Webhook lag'}],
    accent: 'emerald',
  },
  {
    href: '/platform/modules',
    icon: Boxes,
    label: 'Modules',
    description: 'Catalog rollout, plan tiers, governance.',
    primary:   {value: null, label: 'Live'},
    secondary: [{value: null, label: 'Pilot'}, {value: null, label: 'Draft'}],
    accent: 'sky',
  },
];

// ─── Page ───────────────────────────────────────────────────────────

export default function PlatformOverviewPage() {
  return (
    <div className="stack-page">
      <Hero />

      <SystemHealthRail />

      {/* ── Tier 2: success/failure + activity stream ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <OperationsStrip />
        <ActivityStream />
      </div>

      {/* ── Tier 3: operational zones drilldown ── */}
      <ZonesGrid />

      {/* ── Tier 4: runtime + shortcuts ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <RuntimeStrip />
        <PlatformShortcuts />
      </div>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/55 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-glass dark:border-zinc-800/55 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25 dark:shadow-glass-dark">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-12 -top-32 h-[360px] w-[360px] rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-[-7rem] h-[280px] w-[280px] rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <span className="live-dot" aria-hidden="true" />
            Platform · control center
          </p>
          <h1 className="t-h1 mt-3">Operational observability.</h1>
          <p className="t-body mt-3 max-w-lg">
            Tenant health, runtime status, queue depth, billing pipeline. The platform
            admin&apos;s surface — separate from any tenant workspace. Slice by window;
            drill into a zone when something needs attention.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PeriodFilter />
            <Link href="/platform/audit" className="btn-ghost h-9 px-3 text-xs">
              <ShieldAlert size={12} />
              Audit ledger
            </Link>
            <Link href="/platform/runtime" className="btn-ghost h-9 px-3 text-xs">
              <Activity size={12} />
              Runtime
            </Link>
          </div>
        </div>

        {/* Hero stat cluster */}
        <div className="grid grid-cols-2 gap-3">
          <HeroStat label="Tenants"          value={null} sub="Active workspaces"   icon={Building2}    tone="indigo" />
          <HeroStat label="Runtime"          value={null} sub="Active executions"   icon={Cpu}          tone="violet"  stripes />
          <HeroStat label="Modules live"     value={null} sub="Across catalog"      icon={Boxes}        tone="sky" />
          <HeroStat label="MRR"              value={null} sub="Stripe pipeline"     icon={Gauge}        tone="emerald" />
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  stripes,
}: {
  label: string;
  value: number | null;
  sub: string;
  icon: LucideIcon;
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
          <Icon size={13} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{label}</span>
      </div>
      <p className={`relative mt-3 text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>
        {value == null ? '—' : <AnimatedNumber value={value} />}
      </p>
      <p className="relative mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">{sub}</p>
    </div>
  );
}

// ─── System health rail ──────────────────────────────────────────────

function SystemHealthRail() {
  return (
    <section className="surface-translucent relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <HeartPulse size={11} className="text-emerald-600 dark:text-emerald-400" />
            System health
          </p>
          <h2 className="t-h3 mt-1">Platform zones</h2>
          <p className="t-small mt-1 max-w-lg">
            Heartbeat across every dependency of the platform. Each zone shows current
            state, latency, and uptime for the selected window.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span className="live-dot" aria-hidden="true" />
          Heartbeat live
        </span>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ZONES.map((zone) => <HealthCell key={zone.label} zone={zone} />)}
      </ul>
    </section>
  );
}

function HealthCell({zone}: {zone: ZoneHealth}) {
  const meta = STATE_META[zone.state];
  const StateIcon = meta.icon;
  const toneText  = HERO_TONE[meta.tone === 'zinc' ? 'indigo' : meta.tone].text;
  const dotTone   =
    meta.tone === 'emerald' ? 'bg-emerald-500' :
    meta.tone === 'amber'   ? 'bg-amber-500' :
    meta.tone === 'red'     ? 'bg-red-500' :
                              'bg-zinc-400';

  return (
    <li className="surface-inset relative overflow-hidden px-3 py-3">
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-0.5 ${dotTone}`} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200">{zone.label}</p>
        <span className={`inline-flex items-center gap-1 ${toneText}`}>
          <StateIcon size={11} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{meta.label}</span>
          {meta.pulse && <span className={`ml-0.5 h-1.5 w-1.5 rounded-full ${dotTone} animate-pulse-dot`} />}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[10px] text-zinc-400 dark:text-zinc-600">{zone.service}</p>
      <div className="mt-2 flex items-center justify-between text-[10px] tabular-nums text-zinc-500 dark:text-zinc-500">
        <span><span className="opacity-70">p95</span> {zone.latency ?? '—'}</span>
        <span><span className="opacity-70">up</span> {zone.uptime ?? '—'}</span>
      </div>
    </li>
  );
}

// ─── Operations strip (success/failure metrics) ─────────────────────

function OperationsStrip() {
  return (
    <section className="surface-translucent relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-12 top-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <Zap size={11} className="text-emerald-600 dark:text-emerald-400" />
            Operations
          </p>
          <h3 className="t-h3 mt-1">Success vs failure</h3>
          <p className="t-small mt-1 max-w-md">
            Platform-wide operation counts: API requests, Pulse actions, runtime
            executions, Stripe webhooks. Sliced by the period above.
          </p>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-4">
        <OperationCell label="Total"        value={null} tone="indigo"  icon={Activity}    hint="Across all zones" />
        <OperationCell label="Succeeded"    value={null} tone="emerald" icon={CheckCircle2} hint="2xx + finalised" />
        <OperationCell label="Failed"       value={null} tone="red"     icon={XCircle}      hint="5xx + dead-letter" />
        <OperationCell label="Median lat."  value={null} tone="violet"  icon={Timer}        hint="p50 across surfaces" />
      </div>

      <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
        <BreakdownRow label="API"      success={null} failure={null} />
        <BreakdownRow label="Runtime"  success={null} failure={null} />
        <BreakdownRow label="Webhooks" success={null} failure={null} />
      </div>
    </section>
  );
}

function OperationCell({
  label,
  value,
  tone,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | null;
  tone: keyof typeof HERO_TONE;
  icon: LucideIcon;
  hint: string;
}) {
  const t = HERO_TONE[tone];
  return (
    <div className="surface-inset px-3 py-3">
      <div className="flex items-center justify-between">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${t.bg} ${t.text}`}>
          <Icon size={13} />
        </span>
        <span className="t-meta-xs">{hint}</span>
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums tracking-tight ${t.text}`}>
        {value == null ? '—' : <AnimatedNumber value={value} />}
      </p>
    </div>
  );
}

function BreakdownRow({label, success, failure}: {label: string; success: number | null; failure: number | null}) {
  // Visual ratio bar — 60/8/32 splits read clearly even when empty.
  const successPct = success == null ? 0 : Math.min(100, success);
  const failurePct = failure == null ? 0 : Math.min(100, failure);
  return (
    <div className="surface-inset px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="font-mono text-[10px] tabular-nums text-zinc-500 dark:text-zinc-500">
          {success == null ? '—' : <AnimatedNumber value={successPct} />} ·{' '}
          {failure == null ? '—' : <AnimatedNumber value={failurePct} />}
        </span>
      </div>
      <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-zinc-200/60 dark:bg-zinc-800/60">
        <span
          className="bar-progress h-full bg-emerald-500/70"
          style={{['--w' as string]: `${successPct}%`} as React.CSSProperties}
        />
        <span
          className="bar-progress h-full bg-red-500/70"
          style={{['--w' as string]: `${failurePct}%`} as React.CSSProperties}
        />
      </div>
    </div>
  );
}

// ─── System activity stream ─────────────────────────────────────────

function ActivityStream() {
  return (
    <section className="surface-rail relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            System activity
          </p>
          <h3 className="t-h3 mt-1">Recent platform events</h3>
        </div>
        <Link
          href="/platform/audit"
          className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Audit ledger
        </Link>
      </div>

      <div className="m-5 mt-4 rounded-xl border border-dashed border-zinc-200/55 bg-white/40 p-4 dark:border-zinc-800/55 dark:bg-zinc-900/30">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
          Pending — wire to <span className="font-mono">audit:read</span>
        </p>
        <p className="mt-2 t-small">
          The append-only audit ledger is live in the backend (`AuditService.record(...)`).
          A paginated, filterable stream surfaces here once <span className="font-mono">GET /v1/platform/audit/events</span>
          {' '}is exposed to the platform client.
        </p>

        <ul className="mt-3 space-y-1.5 text-[12px] text-zinc-600 dark:text-zinc-400">
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" />
            <span className="font-mono text-[11px]">auth.*</span>
            <span className="t-meta-xs">login / logout / lockout</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" />
            <span className="font-mono text-[11px]">pulse.ticket.*</span>
            <span className="t-meta-xs">assign / resolve / escalate</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" />
            <span className="font-mono text-[11px]">billing.stripe_webhook.processed</span>
            <span className="t-meta-xs">subscription events</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" />
            <span className="font-mono text-[11px]">runtime.execution.*</span>
            <span className="t-meta-xs">requested / transitioned / cancelled</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

// ─── Operational zones drilldown ────────────────────────────────────

function ZonesGrid() {
  return (
    <section>
      <RailHeader eyebrow="Drilldown" title="Operational zones" />
      <div className="grid gap-3 stagger-children sm:grid-cols-2 xl:grid-cols-4">
        {ZONE_CARDS.map((z) => (
          <Link
            key={z.label}
            href={z.href}
            className="animate-slide-up surface-translucent surface-hover-brand group relative flex flex-col overflow-hidden p-5"
          >
            <div className={`pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-gradient-to-tr ${ZONE_ACCENT[z.accent].halo} opacity-70 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className="relative flex items-start justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${ZONE_ACCENT[z.accent].iconBg}`}>
                <z.icon size={18} />
              </span>
              <ArrowUpRight size={14} className="row-arrow" />
            </div>
            <div className="relative mt-4">
              <p className="t-h3">{z.label}</p>
              <p className="t-small mt-1 line-clamp-2">{z.description}</p>
            </div>
            <div className="relative mt-4 flex items-end gap-4 border-t border-zinc-200/55 pt-3 dark:border-zinc-800/55">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{z.primary.label}</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                  {z.primary.value == null ? '—' : <AnimatedNumber value={z.primary.value} />}
                </p>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2">
                {z.secondary.map((s) => (
                  <div key={s.label} className="rounded-lg border border-zinc-200/55 bg-white/55 px-2 py-1 dark:border-zinc-800/55 dark:bg-zinc-900/45">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{s.label}</p>
                    <p className="text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
                      {s.value == null ? '—' : <AnimatedNumber value={s.value} />}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Runtime observability strip ────────────────────────────────────

function RuntimeStrip() {
  return (
    <section className="surface-translucent relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-12 top-0 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-violet-500/8 to-transparent animate-sweep" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow">Runtime observability</p>
          <h3 className="t-h3 mt-1">Workers, queues, executions</h3>
          <p className="t-small mt-1 max-w-md">
            Live snapshot of the Go runtime, BullMQ queues, and execution lifecycle.
            Surfaces wire up once platform metrics ship.
          </p>
        </div>
        <Link href="/platform/runtime" className="btn-secondary h-9 px-3 text-xs">
          Open runtime
          <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RuntimeCell label="Active workers" value={null} hint="Heartbeats"     icon={Cpu}        tone="violet" />
        <RuntimeCell label="Queue depth"    value={null} hint="Messages"      icon={Database}   tone="indigo" />
        <RuntimeCell label="Exec / min"     value={null} hint="Last 60s"      icon={Workflow}   tone="emerald" />
        <RuntimeCell label="Error rate"     value={null} hint="Per 1k ops"    icon={AlertOctagon} tone="red" />
      </div>
    </section>
  );
}

function RuntimeCell({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | null;
  hint: string;
  icon: LucideIcon;
  tone: keyof typeof HERO_TONE;
}) {
  const t = HERO_TONE[tone];
  return (
    <div className="surface-inset flex items-center gap-3 px-3 py-3">
      <span className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br ${t.bg}`}>
        <Icon size={14} className={t.text} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{label}</p>
        <p className={`mt-0.5 text-base font-bold tabular-nums tracking-tight ${t.text}`}>
          {value == null ? '—' : <AnimatedNumber value={value} />}
        </p>
      </div>
      <p className="hidden text-[11px] text-zinc-400 dark:text-zinc-600 sm:block">{hint}</p>
    </div>
  );
}

// ─── Platform shortcuts ─────────────────────────────────────────────

function PlatformShortcuts() {
  return (
    <section className="surface-rail relative">
      <div className="px-5 pt-5">
        <p className="section-eyebrow">Shortcuts</p>
        <h3 className="t-h3 mt-1">Operator jumps</h3>
      </div>
      <ul className="space-y-1 px-3 py-3">
        <ShortcutItem href="/platform/tenants"      icon={Building2}    label="Tenants directory" kbd="g t" />
        <ShortcutItem href="/platform/modules"      icon={Boxes}        label="Module catalog"    kbd="g m" />
        <ShortcutItem href="/platform/billing"      icon={CreditCard}   label="Billing pipeline"  kbd="g b" />
        <ShortcutItem href="/platform/flags"        icon={Flag}         label="Feature flags"     kbd="g f" />
        <ShortcutItem href="/platform/runtime"      icon={Activity}     label="Runtime"           kbd="g r" />
        <ShortcutItem href="/platform/integrations" icon={Plug}         label="Integrations"      kbd="g i" />
        <ShortcutItem href="/platform/audit"        icon={ShieldCheck}  label="Audit ledger"      kbd="g a" />
      </ul>
      <div className="border-t border-zinc-200/55 px-5 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/55 dark:text-zinc-500">
        Press <span className="kbd">⌘</span> <span className="kbd">K</span> to open the command palette.
      </div>
    </section>
  );
}

function ShortcutItem({href, icon: Icon, label, kbd}: {href: string; icon: LucideIcon; label: string; kbd: string}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-zinc-700 transition-soft hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-900/60"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-indigo-900/30 dark:group-hover:text-indigo-300">
          <Icon size={12} />
        </span>
        <span className="flex-1">{label}</span>
        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600">{kbd}</span>
      </Link>
    </li>
  );
}

// ─── Misc ────────────────────────────────────────────────────────────

function RailHeader({eyebrow, title}: {eyebrow: string; title: string}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="t-h3 mt-1">{title}</h2>
      </div>
      <Link href="#" className="hidden text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400 sm:inline">
        <span className="inline-flex items-center gap-1">View all <ArrowRight size={11} /></span>
      </Link>
    </div>
  );
}
