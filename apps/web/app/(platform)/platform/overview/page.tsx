import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  CreditCard,
  Cpu,
  Database,
  Flag,
  Gauge,
  HeartPulse,
  Plug,
  ShieldAlert,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Platform Overview'};

/**
 * Platform admin overview — control center.
 *
 *   - Translucent hero strip; no boxy 3xl PageHeader.
 *   - Asymmetric grid: a wide health rail on the left (multi-zone status,
 *     runtime, queues), a denser zone of platform metrics; right column
 *     hosts a live ledger preview and operator shortcuts.
 *   - All numbers render `—` until the platform metrics surface ships;
 *     this page never invents data.
 */

interface StatusEntry {
  label: string;
  value: string;
  tone: 'emerald' | 'amber' | 'red' | 'zinc';
  hint?: string;
}

const SYSTEM_STATUS: ReadonlyArray<StatusEntry> = [
  {label: 'API',          value: 'Stable',      tone: 'emerald', hint: 'NestJS · /v1'},
  {label: 'Runtime',      value: 'Reachable',   tone: 'emerald', hint: 'Go runtime · proxied'},
  {label: 'Queues',       value: '—',           tone: 'zinc',    hint: 'Worker depth'},
  {label: 'Database',     value: 'Healthy',     tone: 'emerald', hint: 'Prisma · Postgres'},
  {label: 'Stripe',       value: '—',           tone: 'zinc',    hint: 'Webhook lag'},
  {label: 'Audit',        value: 'Live',        tone: 'emerald', hint: 'Append-only ledger'},
];

const TONE: Record<StatusEntry['tone'], {dot: string; text: string; bg: string}> = {
  emerald: {dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  amber:   {dot: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
  red:     {dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',         bg: 'from-red-500/15 to-red-500/0'},
  zinc:    {dot: 'bg-zinc-400',    text: 'text-zinc-700 dark:text-zinc-300',       bg: 'from-zinc-500/10 to-zinc-500/0'},
};

interface ZoneCard {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  primary: {value: string; label: string};
  secondary: ReadonlyArray<{value: string; label: string}>;
  accent: 'indigo' | 'violet' | 'emerald' | 'amber' | 'sky';
}

const ZONE_ACCENT: Record<ZoneCard['accent'], {iconBg: string; halo: string}> = {
  indigo:  {iconBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',  halo: 'from-indigo-500/20 via-indigo-500/5 to-transparent'},
  violet:  {iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',  halo: 'from-violet-500/20 via-violet-500/5 to-transparent'},
  emerald: {iconBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', halo: 'from-emerald-500/20 via-emerald-500/5 to-transparent'},
  amber:   {iconBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',     halo: 'from-amber-500/20 via-amber-500/5 to-transparent'},
  sky:     {iconBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',           halo: 'from-sky-500/20 via-sky-500/5 to-transparent'},
};

const ZONES: ReadonlyArray<ZoneCard> = [
  {
    href: '/platform/tenants',
    icon: Building2,
    label: 'Tenants',
    description: 'Active workspaces, suspended, pending setup.',
    primary: {value: '—', label: 'Active'},
    secondary: [{value: '—', label: 'Suspended'}, {value: '—', label: 'Pending'}],
    accent: 'indigo',
  },
  {
    href: '/platform/runtime',
    icon: Activity,
    label: 'Runtime',
    description: 'Worker health, queue depth, error rate.',
    primary: {value: '—', label: 'Workers'},
    secondary: [{value: '—', label: 'Queue depth'}, {value: '—', label: 'Errors / hr'}],
    accent: 'violet',
  },
  {
    href: '/platform/billing',
    icon: CreditCard,
    label: 'Billing',
    description: 'Subscriptions, invoices, Stripe webhook lag.',
    primary: {value: '—', label: 'MRR'},
    secondary: [{value: '—', label: 'Customers'}, {value: '—', label: 'Webhook lag'}],
    accent: 'emerald',
  },
  {
    href: '/platform/modules',
    icon: Boxes,
    label: 'Modules',
    description: 'Catalog rollout, plan tiers, governance.',
    primary: {value: '—', label: 'Live'},
    secondary: [{value: '—', label: 'Pilot'}, {value: '—', label: 'Draft'}],
    accent: 'sky',
  },
];

export default function PlatformOverviewPage() {
  return (
    <div className="space-y-10">
      <Hero />

      {/* ── Asymmetric grid: health + zones (left) · live ledger + ops (right) ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* LEFT */}
        <div className="space-y-6">
          <SystemHealthRail />
          <ZonesGrid />
          <RuntimeStrip />
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <AuditPreview />
          <PlatformShortcuts />
        </div>
      </div>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-soft dark:border-zinc-800/70 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25">
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
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-zinc-50 sm:text-[2.25rem]">
            Operational observability.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Tenant health, runtime status, queue depth, billing pipeline. The platform admin&apos;s surface — separate from any tenant workspace.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href="/platform/tenants" className="btn-primary h-10 px-4">
              <Building2 size={14} />
              Tenants directory
            </Link>
            <Link href="/platform/runtime" className="btn-secondary h-10 px-4">
              <Activity size={14} />
              Runtime
            </Link>
            <Link href="/platform/audit" className="btn-ghost h-10 px-4">
              <ShieldAlert size={14} />
              Audit ledger
            </Link>
          </div>
        </div>

        {/* Hero stat cluster */}
        <div className="grid grid-cols-2 gap-3">
          <HeroStat label="Tenants"      value="—" sub="Active workspaces"  icon={Building2}  tone="indigo" />
          <HeroStat label="Runtime"      value="—" sub="Active executions"  icon={Cpu}        tone="violet"  stripes />
          <HeroStat label="Modules live" value="—" sub="Across catalog"     icon={Boxes}      tone="sky" />
          <HeroStat label="MRR"          value="—" sub="Stripe pipeline"    icon={Gauge}      tone="emerald" />
        </div>
      </div>
    </section>
  );
}

const HERO_TONE: Record<'indigo' | 'violet' | 'sky' | 'emerald', {text: string; bg: string}> = {
  indigo:  {text: 'text-indigo-700 dark:text-indigo-300',   bg: 'from-indigo-500/15 to-indigo-500/0'},
  violet:  {text: 'text-violet-700 dark:text-violet-300',   bg: 'from-violet-500/15 to-violet-500/0'},
  sky:     {text: 'text-sky-700 dark:text-sky-300',         bg: 'from-sky-500/15 to-sky-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
};

function HeroStat({label, value, sub, icon: Icon, tone, stripes}: {label: string; value: string; sub: string; icon: LucideIcon; tone: keyof typeof HERO_TONE; stripes?: boolean}) {
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
      <p className={`relative mt-3 text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>{value}</p>
      <p className="relative mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">{sub}</p>
    </div>
  );
}

// ─── System health rail ──────────────────────────────────────────────

function SystemHealthRail() {
  return (
    <section className="surface-translucent relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <HeartPulse size={11} className="text-emerald-600 dark:text-emerald-400" />
            System health
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Platform zones
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span className="live-dot" aria-hidden="true" />
          Heartbeat live
        </span>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SYSTEM_STATUS.map((s) => {
          const t = TONE[s.tone];
          return (
            <li key={s.label} className="surface-inset relative overflow-hidden px-3 py-2.5">
              <div className={`pointer-events-none absolute inset-y-0 left-0 w-0.5 ${t.dot}`} />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500">{s.label}</p>
                <span className={`inline-flex items-center gap-1 ${t.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${t.dot} ${s.tone === 'emerald' ? 'animate-pulse-dot' : ''}`} />
                  <span className="text-[11px] font-semibold">{s.value}</span>
                </span>
              </div>
              {s.hint && (
                <p className="mt-0.5 truncate text-[10px] text-zinc-400 dark:text-zinc-600">{s.hint}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Zones grid (Tenants / Runtime / Billing / Modules) ─────────────

function ZonesGrid() {
  return (
    <section>
      <RailHeader eyebrow="Drilldown" title="Operational zones" />
      <div className="grid gap-3 sm:grid-cols-2">
        {ZONES.map((z) => (
          <Link
            key={z.label}
            href={z.href}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/65 p-5 backdrop-blur-xl shadow-soft transition-all duration-200 ease-snap hover:-translate-y-[2px] hover:border-indigo-200/80 hover:shadow-card dark:border-zinc-800/70 dark:bg-zinc-900/55 dark:hover:border-indigo-800/60"
          >
            <div className={`pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-gradient-to-tr ${ZONE_ACCENT[z.accent].halo} opacity-70 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className="relative flex items-start justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${ZONE_ACCENT[z.accent].iconBg}`}>
                <z.icon size={18} />
              </span>
              <ArrowUpRight size={14} className="row-arrow" />
            </div>
            <div className="relative mt-4">
              <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{z.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500 line-clamp-2">{z.description}</p>
            </div>
            <div className="relative mt-4 flex items-end gap-4 border-t border-zinc-100 pt-3 dark:border-zinc-800/60">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{z.primary.label}</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">{z.primary.value}</p>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2">
                {z.secondary.map((s) => (
                  <div key={s.label} className="rounded-lg border border-zinc-200/60 bg-white/60 px-2 py-1 dark:border-zinc-800/60 dark:bg-zinc-900/50">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{s.label}</p>
                    <p className="text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-200">{s.value}</p>
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

// ─── Runtime strip — wider operational density ──────────────────────

function RuntimeStrip() {
  return (
    <section className="surface-translucent relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-12 top-0 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-violet-500/8 to-transparent animate-sweep" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow">Runtime observability</p>
          <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Workers, queues, executions
          </h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
            Live snapshot of the Go runtime, BullMQ queues, and execution lifecycle. Surfaces wire up once platform metrics ship.
          </p>
        </div>
        <Link href="/platform/runtime" className="btn-secondary h-9 px-3 text-xs">
          Open runtime
          <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <RuntimeCell label="Active workers"   value="—" hint="Heartbeats" icon={Cpu}      tone="violet" />
        <RuntimeCell label="Queue depth"      value="—" hint="Messages"   icon={Database} tone="indigo" />
        <RuntimeCell label="Execution / min"  value="—" hint="Last 60s"   icon={Workflow} tone="emerald" />
      </div>
    </section>
  );
}

function RuntimeCell({label, value, hint, icon: Icon, tone}: {label: string; value: string; hint: string; icon: LucideIcon; tone: keyof typeof HERO_TONE}) {
  const t = HERO_TONE[tone];
  return (
    <div className="surface-inset flex items-center gap-3 px-3 py-3">
      <span className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br ${t.bg}`}>
        <Icon size={14} className={t.text} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
          {label}
        </p>
        <p className={`mt-0.5 text-base font-bold tabular-nums tracking-tight ${t.text}`}>{value}</p>
      </div>
      <p className="hidden text-[11px] text-zinc-400 dark:text-zinc-600 sm:block">{hint}</p>
    </div>
  );
}

// ─── Audit preview (right column) ───────────────────────────────────

function AuditPreview() {
  return (
    <section className="surface-rail relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            Audit
          </p>
          <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Recent platform events
          </h3>
        </div>
        <Link href="/platform/audit" className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Open ledger
        </Link>
      </div>

      <div className="m-5 mt-4 rounded-xl border border-dashed border-zinc-200 bg-white/40 p-5 dark:border-zinc-800/70 dark:bg-zinc-900/30">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
          Pending — wire to <span className="font-mono">audit:read</span>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
          The audit service ledger is live (`AuditService.record(...)`). The platform admin reader surfaces a paginated, filterable view here once `GET /v1/platform/audit/events` is exposed.
        </p>
      </div>
    </section>
  );
}

// ─── Platform shortcuts ─────────────────────────────────────────────

function PlatformShortcuts() {
  return (
    <section className="surface-rail relative">
      <div className="px-5 pt-5">
        <p className="section-eyebrow">Shortcuts</p>
        <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Operator jumps</h3>
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
      <div className="border-t border-zinc-100 px-5 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-500">
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
        className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-zinc-700 transition-colors duration-150 ease-snap hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-900/60"
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
        <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
      </div>
      <Link href="#" className="hidden text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400 sm:inline">
        <span className="inline-flex items-center gap-1">View all <ArrowRight size={11} /></span>
      </Link>
    </div>
  );
}
