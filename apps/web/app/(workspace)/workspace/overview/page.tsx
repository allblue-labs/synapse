import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Boxes,
  ClipboardList,
  Cpu,
  Inbox,
  LineChart,
  Plug,
  ShieldCheck,
  Sparkles,
  Ticket,
  TimerReset,
  Workflow,
  Zap,
} from 'lucide-react';
import {Can} from '@/components/auth/can';
import {loadInboxLanes} from '@/lib/pulse/loaders';
import type {PulseTicketRow} from '@/lib/pulse/types';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Overview'};

/**
 * Workspace overview — operational front door.
 *
 * Pulls live signal from the Pulse loaders (best-effort) and renders an
 * asymmetric, layered dashboard:
 *   - Hero strip with greeting + live ops pulse + quick CTAs
 *   - 2/3 left: operational metrics rail + active modules
 *   - 1/3 right: live activity ticker + AI usage + shortcuts
 *
 * Honest empty states everywhere — the page never invents numbers.
 */

interface MetricSeed {
  label: string;
  value: string | number;
  trend?: string;
  tone: 'brand' | 'amber' | 'emerald' | 'zinc' | 'violet';
  icon: typeof Activity;
  spark?: ReadonlyArray<number>;
}

const TONE_TEXT: Record<MetricSeed['tone'], string> = {
  brand:   'text-brand-700 dark:text-brand-300',
  amber:   'text-amber-700 dark:text-amber-400',
  emerald: 'text-emerald-700 dark:text-emerald-400',
  zinc:    'text-zinc-800 dark:text-zinc-200',
  violet:  'text-violet-700 dark:text-violet-300',
};

const TONE_BG: Record<MetricSeed['tone'], string> = {
  brand:   'from-brand-500/15 to-brand-500/0',
  amber:   'from-amber-500/15 to-amber-500/0',
  emerald: 'from-emerald-500/15 to-emerald-500/0',
  zinc:    'from-zinc-500/10 to-zinc-500/0',
  violet:  'from-violet-500/15 to-violet-500/0',
};

const SPARK_FALLBACK = [22, 30, 28, 36, 42, 38, 50, 46, 58, 64, 60, 72] as const;

export default async function OverviewPage() {
  const inbox = await loadInboxLanes();
  const ok = inbox.kind === 'ok' ? inbox.data : null;

  const needsReview = ok?.needsReview.length ?? 0;
  const inFlow      = ok?.open.length        ?? 0;
  const waiting     = ok?.waiting.length     ?? 0;
  const totalLive   = needsReview + inFlow + waiting;

  // Shape the live tickets into a single chronological ticker (best-effort).
  const tickerRows: ReadonlyArray<PulseTicketRow> = ok
    ? [...ok.needsReview, ...ok.open, ...ok.waiting].slice(0, 8)
    : [];

  const metrics: ReadonlyArray<MetricSeed> = [
    {label: 'Needs review',       value: needsReview, tone: 'amber',   icon: Inbox,        spark: synthSpark(needsReview, 4)},
    {label: 'In flow',            value: inFlow,      tone: 'brand',   icon: Workflow,     spark: synthSpark(inFlow, 8)},
    {label: 'Waiting customer',   value: waiting,     tone: 'zinc',    icon: TimerReset,   spark: synthSpark(waiting, 6)},
    {label: 'Resolved 24h',       value: '—',         tone: 'emerald', icon: ShieldCheck,  spark: SPARK_FALLBACK.slice()},
  ];

  return (
    <div className="space-y-10">
      {/* ── Hero strip — translucent, less boxy than the old PageHeader card ─ */}
      <Hero totalLive={totalLive} />

      {/* ── Asymmetric grid ────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">

        {/* LEFT — operational signal */}
        <div className="space-y-6">
          {/* Metrics rail */}
          <section>
            <RailHeader eyebrow="Operational pulse" title="Live signal" hint={ok ? 'Live · auto-refresh on focus' : 'No signal'} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((m) => <MetricTile key={m.label} {...m} />)}
            </div>
          </section>

          {/* AI usage strip */}
          <AiUsageStrip />

          {/* Active modules */}
          <section>
            <RailHeader
              eyebrow="Modules"
              title="Active surfaces"
              link={{href: '/workspace/modules', label: 'Open module store'}}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <ModuleCard
                href="/workspace/modules/pulse"
                icon={Sparkles}
                tone="brand"
                title="Pulse"
                subtitle="Operational comms & workflow"
                meta={`${totalLive} live · ${needsReview} need review`}
                accent="from-brand-500/15 via-brand-500/5 to-transparent"
              />
              <ModuleCard
                href="/workspace/agents"
                icon={Bot}
                tone="violet"
                title="Agents"
                subtitle="Custom AI orchestration"
                meta="Stage 1B · ready to define"
                accent="from-violet-500/15 via-violet-500/5 to-transparent"
              />
              <ModuleCard
                href="/workspace/modules"
                icon={Boxes}
                tone="zinc"
                title="Module store"
                subtitle="Discover, install, upgrade"
                meta="Browse the catalog"
                accent="from-zinc-500/10 via-zinc-500/5 to-transparent"
              />
              <ModuleCard
                href="/workspace/activity"
                icon={Activity}
                tone="emerald"
                title="Activity"
                subtitle="Tenant-wide ledger"
                meta="Recent events"
                accent="from-emerald-500/15 via-emerald-500/5 to-transparent"
              />
            </div>
          </section>
        </div>

        {/* RIGHT — live ticker + shortcuts */}
        <div className="space-y-6">
          <LiveTicker rows={tickerRows} fallbackKind={inbox.kind} />
          <ShortcutsRail />
        </div>
      </div>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero({totalLive}: {totalLive: number}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-xl shadow-soft dark:border-zinc-800/70 dark:from-zinc-900/70 dark:via-zinc-900/45 dark:to-zinc-900/30">
      {/* Layered ambient cues, kept inside the hero so other surfaces stay clean. */}
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-24 -top-32 h-[360px] w-[360px] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-[-6rem] h-[280px] w-[280px] rounded-full bg-accent-500/10 blur-3xl" />
      {/* Subtle horizontal sweep — registers as "live" without being flashy. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            <span className="live-dot" aria-hidden="true" />
            Workspace live
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-zinc-50 sm:text-[2.25rem]">
            Your platform, in motion.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Operational signal across Pulse, Agents and the Module store. The AI handles the floor; you watch the room and step in only where it matters.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href="/workspace/modules/pulse/inbox" className="btn-primary h-10 px-4">
              <Inbox size={14} />
              Open Pulse inbox
            </Link>
            <Link href="/workspace/modules" className="btn-secondary h-10 px-4">
              <Boxes size={14} />
              Module store
            </Link>
            <Can permission="agents:write">
              <Link href="/workspace/agents" className="btn-ghost h-10 px-4">
                <Bot size={14} />
                New agent
              </Link>
            </Can>
          </div>
        </div>

        {/* Hero stat cluster — asymmetric layout, layered surface cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <HeroStat
            label="Live items"
            value={String(totalLive)}
            sub="Across Pulse lanes"
            icon={Activity}
            tone="brand"
            stripes
          />
          <HeroStat
            label="AI confidence"
            value="—"
            sub="Median 24h window"
            icon={Sparkles}
            tone="violet"
          />
          <HeroStat
            label="Operator actions"
            value="—"
            sub="Per hour"
            icon={Zap}
            tone="amber"
          />
          <HeroStat
            label="Resolution rate"
            value="—"
            sub="Last 7d"
            icon={LineChart}
            tone="emerald"
          />
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
  value: string;
  sub: string;
  icon: typeof Activity;
  tone: MetricSeed['tone'];
  stripes?: boolean;
}) {
  return (
    <div className="surface-dock relative overflow-hidden p-4">
      {stripes && <div aria-hidden="true" className="pointer-events-none absolute inset-0 stripes-pulse opacity-30" />}
      <div className="relative flex items-start justify-between">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${TONE_BG[tone]}`}>
          <Icon size={13} className={TONE_TEXT[tone]} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{label}</span>
      </div>
      <p className={`relative mt-3 text-2xl font-bold tabular-nums tracking-tight ${TONE_TEXT[tone]}`}>{value}</p>
      <p className="relative mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">{sub}</p>
    </div>
  );
}

// ─── Metric tile (with sparkbar) ─────────────────────────────────────

function MetricTile({label, value, tone, icon: Icon, spark}: MetricSeed) {
  const bars = spark && spark.length > 0 ? spark : SPARK_FALLBACK.slice();
  const max = Math.max(...bars, 1);
  return (
    <div className="surface-translucent relative overflow-hidden p-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b ${TONE_BG[tone]} opacity-70`} />

      <div className="relative flex items-start justify-between">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${TONE_BG[tone]}`}>
          <Icon size={13} className={TONE_TEXT[tone]} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{label}</span>
      </div>

      <div className="relative mt-3 flex items-end justify-between">
        <p className={`text-2xl font-bold tabular-nums tracking-tight ${TONE_TEXT[tone]}`}>{value}</p>
        <div className="sparkbar" aria-hidden="true">
          {bars.map((v, i) => (
            <i
              key={i}
              style={{['--h' as string]: `${Math.max(8, (v / max) * 100)}%`} as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AI usage strip ──────────────────────────────────────────────────

function AiUsageStrip() {
  return (
    <section className="surface-translucent relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-12 top-0 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">AI usage</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Inference, automations, confidence
          </h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
            Pulse hands off to humans only when confidence drops or a playbook step requires it. Surface trends here once metering ships.
          </p>
        </div>
        <Link
          href="/workspace/modules/pulse/metrics"
          className="group inline-flex items-center gap-1 rounded-lg border border-zinc-200/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-soft transition-all duration-200 ease-snap hover:-translate-y-px hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Open metrics
          <ArrowUpRight size={12} className="row-arrow" />
        </Link>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <UsageCell label="Inference"   value="—" hint="LLM calls / day"   icon={Cpu}     tone="brand" />
        <UsageCell label="Automations" value="—" hint="Steps executed"    icon={Workflow} tone="violet" />
        <UsageCell label="Confidence"  value="—" hint="Median per skill"  icon={Sparkles} tone="emerald" />
      </div>
    </section>
  );
}

function UsageCell({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Cpu;
  tone: MetricSeed['tone'];
}) {
  return (
    <div className="surface-inset flex items-center gap-3 px-3 py-3">
      <span className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br ${TONE_BG[tone]}`}>
        <Icon size={14} className={TONE_TEXT[tone]} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
          {label}
        </p>
        <p className={`mt-0.5 text-base font-bold tabular-nums tracking-tight ${TONE_TEXT[tone]}`}>{value}</p>
      </div>
      <p className="hidden text-[11px] text-zinc-400 dark:text-zinc-600 sm:block">{hint}</p>
    </div>
  );
}

// ─── Module card ─────────────────────────────────────────────────────

function ModuleCard({
  href,
  icon: Icon,
  tone,
  title,
  subtitle,
  meta,
  accent,
}: {
  href: string;
  icon: typeof Sparkles;
  tone: MetricSeed['tone'];
  title: string;
  subtitle: string;
  meta: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70 p-5 backdrop-blur-xl transition-all duration-200 ease-snap hover:-translate-y-[2px] hover:border-brand-200/80 hover:shadow-card dark:border-zinc-800/70 dark:bg-zinc-900/55 dark:hover:border-brand-800/60"
    >
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r ${accent} opacity-60 transition-opacity duration-300 group-hover:opacity-100`} />
      <span className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${TONE_BG[tone]} ring-1 ring-black/5 dark:ring-white/10`}>
        <Icon size={18} className={TONE_TEXT[tone]} />
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        <p className="mt-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-600">{meta}</p>
      </div>
      <ArrowUpRight size={14} className="row-arrow" />
    </Link>
  );
}

// ─── Live ticker (right rail) ────────────────────────────────────────

function LiveTicker({rows, fallbackKind}: {rows: ReadonlyArray<PulseTicketRow>; fallbackKind: string}) {
  return (
    <section className="surface-rail relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            Live activity
          </p>
          <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Pulse · operational stream
          </h3>
        </div>
        <Link href="/workspace/modules/pulse/timeline" className="text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400">
          Open timeline
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-xs text-zinc-500 dark:text-zinc-500">
          {fallbackKind === 'forbidden'
            ? 'You don’t have permission to view tickets — the ticker is hidden.'
            : fallbackKind === 'error'
              ? 'No live signal available right now.'
              : 'No live items. Pulse will surface tickets here as they move through lanes.'}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 px-1 dark:divide-zinc-800/60">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/workspace/modules/pulse/tickets/${row.id}`}
                className="group flex items-start gap-3 rounded-lg px-4 py-3 transition-colors duration-150 ease-snap hover:bg-white/50 dark:hover:bg-zinc-900/60"
              >
                <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${row.needsReview ? 'bg-amber-500 animate-pulse-dot' : 'bg-brand-500/70'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.customer.displayName ?? row.customer.handle}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-500">
                    {labelFor(row)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
                  {row.status.toLowerCase().replace('_', ' ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function labelFor(row: PulseTicketRow): string {
  const skill = row.skill ?? row.type;
  if (row.preview) return row.preview;
  return `${skill.toString().toLowerCase()} · ${row.priority.toLowerCase()}`;
}

// ─── Shortcuts rail ──────────────────────────────────────────────────

function ShortcutsRail() {
  return (
    <section className="surface-rail relative">
      <div className="px-5 pt-5">
        <p className="section-eyebrow">Shortcuts</p>
        <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Quick actions
        </h3>
      </div>
      <ul className="px-3 py-3 space-y-1">
        <ShortcutItem href="/workspace/modules/pulse/inbox"        icon={Inbox}         label="Open inbox"            kbd="g i" />
        <ShortcutItem href="/workspace/modules/pulse/tickets"      icon={Ticket}        label="Search tickets"        kbd="g t" />
        <ShortcutItem href="/workspace/modules/pulse/playbooks"    icon={Workflow}      label="Playbook editor"       kbd="g p" />
        <ShortcutItem href="/workspace/modules/pulse/knowledge"    icon={ClipboardList} label="Knowledge contexts"    kbd="g k" />
        <ShortcutItem href="/workspace/modules/pulse/integrations" icon={Plug}          label="Integrations"          kbd="g n" />
        <ShortcutItem href="/workspace/settings"                   icon={Cpu}           label="Workspace settings"    kbd="g s" />
      </ul>
      <div className="border-t border-zinc-100 px-5 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-500">
        Press <span className="kbd">⌘</span> <span className="kbd">K</span> to open the command palette.
      </div>
    </section>
  );
}

function ShortcutItem({href, icon: Icon, label, kbd}: {href: string; icon: typeof Inbox; label: string; kbd: string}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-zinc-700 transition-colors duration-150 ease-snap hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-900/60"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-brand-900/30 dark:group-hover:text-brand-300">
          <Icon size={12} />
        </span>
        <span className="flex-1">{label}</span>
        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600">{kbd}</span>
      </Link>
    </li>
  );
}

// ─── Misc ────────────────────────────────────────────────────────────

function RailHeader({eyebrow, title, hint, link}: {eyebrow: string; title: string; hint?: string; link?: {href: string; label: string}}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
      </div>
      {hint && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
          <span className="live-dot" aria-hidden="true" />
          {hint}
        </span>
      )}
      {link && (
        <Link href={link.href} className="group inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
          {link.label}
          <ArrowRight size={12} className="transition-transform duration-200 ease-snap group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/**
 * Generate a small bar series proportional to a current-value cue.
 * No fake numbers — just a shape; backend metrics replace this when they ship.
 */
function synthSpark(now: number, baseline: number): ReadonlyArray<number> {
  const len = 12;
  const arr: number[] = [];
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1);
    const v = baseline + (now - baseline) * t + (Math.sin(i * 1.3) * 1.2);
    arr.push(Math.max(2, v));
  }
  return arr;
}
