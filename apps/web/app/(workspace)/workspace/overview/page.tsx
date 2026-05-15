import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Boxes,
  ClipboardList,
  Cpu,
  Database,
  Plug,
  Settings2,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {api, type CurrentUser, type PulseChannelRecord} from '@/lib/api';
import {loadInboxLanes, loadKnowledgeContexts} from '@/lib/pulse/loaders';
import {AnimatedNumber} from '@/components/ui/animated-number';
import {Can} from '@/components/auth/can';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Overview'};

/**
 * Workspace overview — the tenant's operational front door.
 *
 *   - Cross-module by design. Pulse is one signal among several, never
 *     the spine of this page (Stage 5 strategy rule).
 *   - Composes data from the surfaces actually wired today (channels,
 *     Pulse inbox lanes, knowledge contexts). Everything that depends
 *     on a backend client not yet built (billing summary, rated usage,
 *     cross-module activity ledger) renders as `—` rather than faked.
 *   - Asymmetric grid: identity strip on top, quotas + channels +
 *     activity in a 3-column block, modules cluster, then metrics +
 *     shortcuts. Reads top-to-bottom for a new operator; reads in
 *     parallel for a returning one.
 */

interface ChannelSnapshot {
  total: number;
  active: number;
  needsAttention: number;
  disconnected: number;
  providers: ReadonlyArray<{provider: string; status: PulseChannelRecord['status']}>;
}

interface OverviewData {
  pulseLive: number;
  pulseNeedsReview: number;
  knowledgeTotal: number;
  channelHealth: ChannelSnapshot | null;
}

async function loadOverview(): Promise<OverviewData> {
  // Best-effort parallel fetches. Each loader has its own error envelope,
  // so a single 5xx never takes the whole page down.
  const [lanes, knowledge, channels] = await Promise.all([
    loadInboxLanes(),
    loadKnowledgeContexts({pageSize: 1}),
    api.pulse.listChannels({pageSize: 50}).catch(() => null),
  ]);

  const pulseLive = lanes.kind === 'ok'
    ? lanes.data.needsReview.length + lanes.data.open.length + lanes.data.waiting.length
    : 0;
  const pulseNeedsReview = lanes.kind === 'ok' ? lanes.data.needsReview.length : 0;
  const knowledgeTotal  = knowledge.kind === 'ok' ? knowledge.data.facets.total : 0;

  let channelHealth: ChannelSnapshot | null = null;
  if (channels) {
    channelHealth = {
      total:          channels.total,
      active:         channels.data.filter((c) => c.status === 'ACTIVE').length,
      needsAttention: channels.data.filter((c) => c.status === 'NEEDS_ATTENTION').length,
      disconnected:   channels.data.filter((c) => c.status === 'DISCONNECTED' || c.status === 'DISABLED').length,
      providers:      channels.data.slice(0, 6).map((c) => ({provider: c.provider, status: c.status})),
    };
  }

  return {pulseLive, pulseNeedsReview, knowledgeTotal, channelHealth};
}

export default async function OverviewPage() {
  const [user, data] = await Promise.all([
    api.users.me().catch(() => null),
    loadOverview(),
  ]);

  return (
    <div className="stack-page">
      <Hero user={user} data={data} />

      {/* ── Tier 1: cross-module operational signal (3 columns) ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <QuotasPanel />
        <ChannelsPanel snapshot={data.channelHealth} />
        <ActivityTimeline />
      </div>

      {/* ── Tier 2: modules cluster (Pulse = one of many) ── */}
      <ModulesCluster data={data} />

      {/* ── Tier 3: metrics + shortcuts (2 columns) ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <OperationalMetrics />
        <ShortcutsRail />
      </div>
    </div>
  );
}

// ─── Hero strip ──────────────────────────────────────────────────────

function Hero({user, data}: {user: CurrentUser | null; data: OverviewData}) {
  const tenantName = user?.tenant?.name ?? 'Your workspace';
  const role = formatRole(user?.role);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/55 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-glass dark:border-zinc-800/55 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25 dark:shadow-glass-dark">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-16 -top-24 h-[300px] w-[300px] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-[-6rem] h-[260px] w-[260px] rounded-full bg-accent-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            Workspace · live
          </p>
          <h1 className="t-h1 mt-3">{tenantName}.</h1>
          <p className="t-body mt-3 max-w-lg">
            Cross-module operational view of your tenant. AI signal, channel
            health, quotas, and recent activity in one place — built so you
            can run the platform without bouncing between surfaces.
          </p>
          <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-zinc-500 dark:text-zinc-500">
            <Meta label="Role" value={role} />
            <Meta label="Plan" value="—" hint="Plan summary ships when billing API lands." />
            <Meta label="Period" value="—" />
            <Meta label="Memberships" value={String(user?.memberships?.length ?? '—')} />
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href="/workspace/modules" className="btn-primary h-10 px-4">
              <Boxes size={14} />
              Module store
            </Link>
            <Can permission="agents:write">
              <Link href="/workspace/agents" className="btn-secondary h-10 px-4">
                <Bot size={14} />
                Agents
              </Link>
            </Can>
            <Link href="/workspace/settings" className="btn-ghost h-10 px-4">
              <Settings2 size={14} />
              Workspace settings
            </Link>
          </div>
        </div>

        {/* Hero stat cluster — operational, not Pulse-specific. */}
        <div className="grid grid-cols-2 gap-3">
          <HeroStat
            label="Live items"
            value={data.pulseLive}
            sub="Across Pulse lanes"
            icon={Activity}
            tone="brand"
            stripes={data.pulseLive > 0}
          />
          <HeroStat
            label="Channels"
            value={data.channelHealth?.active ?? null}
            sub="Connected providers"
            icon={Plug}
            tone="emerald"
          />
          <HeroStat
            label="AI inference"
            value={null}
            sub="LLM calls today"
            icon={Cpu}
            tone="violet"
          />
          <HeroStat
            label="Automations"
            value={null}
            sub="Runs / hour"
            icon={Workflow}
            tone="amber"
          />
        </div>
      </div>
    </section>
  );
}

function Meta({label, value, hint}: {label: string; value: string; hint?: string}) {
  return (
    <div className="flex items-center gap-1.5" title={hint}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-600">{label}</span>
      <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
  );
}

const HERO_TONE: Record<'brand' | 'emerald' | 'violet' | 'amber', {text: string; bg: string}> = {
  brand:   {text: 'text-brand-700 dark:text-brand-300',     bg: 'from-brand-500/15 to-brand-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  violet:  {text: 'text-violet-700 dark:text-violet-300',   bg: 'from-violet-500/15 to-violet-500/0'},
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
};

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
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
          {label}
        </span>
      </div>
      <p className={`relative mt-3 text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>
        {value == null ? '—' : <AnimatedNumber value={value} />}
      </p>
      <p className="relative mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">{sub}</p>
    </div>
  );
}

// ─── Quotas (placeholders until billing summary client ships) ────────

interface QuotaRow {
  label: string;
  metric: string;
  icon: LucideIcon;
  tone: 'brand' | 'violet' | 'emerald' | 'amber';
}

const QUOTAS: ReadonlyArray<QuotaRow> = [
  {label: 'AI calls',           metric: 'AI_CALL',              icon: Cpu,      tone: 'violet'},
  {label: 'Automation runs',    metric: 'AUTOMATION_EXECUTION', icon: Workflow, tone: 'brand'},
  {label: 'Messages processed', metric: 'MESSAGE',              icon: Activity, tone: 'emerald'},
  {label: 'Storage',            metric: 'STORAGE',              icon: Database, tone: 'amber'},
];

function QuotasPanel() {
  return (
    <section className="surface-translucent overflow-hidden">
      <RailHeader
        eyebrow="Quotas"
        title="Usage against plan"
        link={{href: '/workspace/settings', label: 'Manage plan'}}
      />
      <ul className="space-y-2.5 px-5 pb-5">
        {QUOTAS.map((q) => <QuotaBar key={q.metric} row={q} />)}
      </ul>
      <p className="border-t border-zinc-200/55 px-5 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/55 dark:text-zinc-500">
        Live usage figures arrive when the billing summary client ships.
      </p>
    </section>
  );
}

function QuotaBar({row}: {row: QuotaRow}) {
  const t = HERO_TONE[row.tone];
  // Placeholder usage bar — backend client ships in a later stage.
  // We deliberately render a low value here (8%) so the bar is visible
  // but reads as a "—" / non-numeric quota until real data arrives.
  return (
    <li className="surface-inset px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${t.bg} ${t.text}`}>
            <row.icon size={12} />
          </span>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{row.label}</span>
        </span>
        <span className="t-meta">—</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800/70">
        <div
          className={`bar-progress h-full bg-gradient-to-r ${t.bg.replace('/0', '/60')}`}
          style={{['--w' as string]: '8%'} as React.CSSProperties}
        />
      </div>
    </li>
  );
}

// ─── Channels ────────────────────────────────────────────────────────

function ChannelsPanel({snapshot}: {snapshot: ChannelSnapshot | null}) {
  return (
    <section className="surface-translucent overflow-hidden">
      <RailHeader
        eyebrow="Channels"
        title="Connected providers"
        link={{href: '/workspace/modules/pulse/integrations', label: 'Manage'}}
      />
      <div className="grid grid-cols-3 gap-2 px-5">
        <ChannelCounter label="Active"   value={snapshot?.active        ?? null} tone="emerald" />
        <ChannelCounter label="Attn"     value={snapshot?.needsAttention ?? null} tone="amber" />
        <ChannelCounter label="Offline"  value={snapshot?.disconnected   ?? null} tone="zinc" />
      </div>

      {snapshot && snapshot.providers.length > 0 ? (
        <ul className="mt-4 space-y-1 px-3 pb-5">
          {snapshot.providers.map((p, i) => (
            <li key={`${p.provider}-${i}`} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/40 transition-soft dark:hover:bg-zinc-900/50">
              <span className="inline-flex items-center gap-2 text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotForStatus(p.status)}`} />
                {formatProvider(p.provider)}
              </span>
              <span className="t-meta">{p.status.toLowerCase().replace('_', ' ')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-5 mt-4 rounded-lg border border-dashed border-zinc-200/55 bg-white/40 p-4 text-[11px] text-zinc-500 dark:border-zinc-800/55 dark:bg-zinc-900/30 dark:text-zinc-500">
          {snapshot
            ? 'No channels connected yet. Add one from the integrations surface.'
            : 'Could not load channel health right now.'}
        </p>
      )}
    </section>
  );
}

function ChannelCounter({label, value, tone}: {label: string; value: number | null; tone: 'emerald' | 'amber' | 'zinc'}) {
  const text =
    tone === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' :
    tone === 'amber'   ? 'text-amber-700 dark:text-amber-400' :
                         'text-zinc-700 dark:text-zinc-300';
  return (
    <div className="surface-inset px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums tracking-tight ${text}`}>
        {value == null ? '—' : <AnimatedNumber value={value} />}
      </p>
    </div>
  );
}

// ─── Activity timeline (placeholder until cross-module ledger ships) ─

function ActivityTimeline() {
  return (
    <section className="surface-translucent overflow-hidden">
      <RailHeader
        eyebrow="Activity"
        title="Recent operational events"
        link={{href: '/workspace/activity', label: 'Full log'}}
      />

      <div className="m-5 mt-3 rounded-xl border border-dashed border-zinc-200/55 bg-white/40 p-4 dark:border-zinc-800/55 dark:bg-zinc-900/30">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
          Pending — cross-module ledger
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          A tenant-wide activity feed (auth, channel changes, Pulse lifecycle, billing
          events) will surface here when the audit/activity client is wired. Today the
          authoritative source is the Pulse ticket timeline per ticket and the platform
          audit ledger.
        </p>
        <Link
          href="/workspace/modules/pulse/timeline"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Pulse timeline
          <ArrowUpRight size={11} />
        </Link>
      </div>
    </section>
  );
}

// ─── Modules cluster ─────────────────────────────────────────────────

function ModulesCluster({data}: {data: OverviewData}) {
  return (
    <section>
      <RailHeader
        eyebrow="Modules"
        title="Active workspace modules"
        link={{href: '/workspace/modules', label: 'Browse store'}}
      />
      <div className="grid gap-3 stagger-children sm:grid-cols-2 xl:grid-cols-4">
        <ModuleCard
          href="/workspace/modules/pulse"
          icon={Sparkles}
          tone="brand"
          title="Pulse"
          subtitle="Operational comms & workflow"
          meta={`${data.pulseLive} live · ${data.pulseNeedsReview} review`}
        />
        <ModuleCard
          href="/workspace/agents"
          icon={Bot}
          tone="violet"
          title="Agents"
          subtitle="Custom AI orchestration"
          meta="—"
        />
        <ModuleCard
          href="/workspace/modules/pulse/knowledge"
          icon={ClipboardList}
          tone="sky"
          title="Knowledge"
          subtitle="Grounding contexts"
          meta={`${data.knowledgeTotal} contexts`}
        />
        <ModuleCard
          href="/workspace/modules"
          icon={Boxes}
          tone="emerald"
          title="Store"
          subtitle="Discover & install"
          meta="Browse catalog"
        />
      </div>
    </section>
  );
}

const MODULE_TONE: Record<'brand' | 'violet' | 'sky' | 'emerald', {iconBg: string; halo: string}> = {
  brand:   {iconBg: 'bg-brand-500/15 text-brand-700 dark:text-brand-300',     halo: 'from-brand-500/15 via-brand-500/5 to-transparent'},
  violet:  {iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',  halo: 'from-violet-500/15 via-violet-500/5 to-transparent'},
  sky:     {iconBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',           halo: 'from-sky-500/15 via-sky-500/5 to-transparent'},
  emerald: {iconBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', halo: 'from-emerald-500/15 via-emerald-500/5 to-transparent'},
};

function ModuleCard({
  href,
  icon: Icon,
  tone,
  title,
  subtitle,
  meta,
}: {
  href: string;
  icon: LucideIcon;
  tone: keyof typeof MODULE_TONE;
  title: string;
  subtitle: string;
  meta: string;
}) {
  const a = MODULE_TONE[tone];
  return (
    <Link
      href={href}
      className="animate-slide-up surface-translucent surface-hover-brand group relative flex items-center gap-4 overflow-hidden p-5"
    >
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r ${a.halo} opacity-50 transition-opacity duration-300 group-hover:opacity-100`} />
      <span className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${a.iconBg} ring-1 ring-black/5 dark:ring-white/10`}>
        <Icon size={18} />
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="t-h3">{title}</p>
        <p className="t-small mt-0.5">{subtitle}</p>
        <p className="t-meta-xs mt-1">{meta}</p>
      </div>
      <ArrowUpRight size={14} className="row-arrow" />
    </Link>
  );
}

// ─── Operational metrics (charts placeholder + AI signal) ────────────

function OperationalMetrics() {
  return (
    <section className="surface-translucent relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-12 top-0 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow">Operational metrics</p>
          <h3 className="t-h3 mt-1">Inference, automations, confidence</h3>
          <p className="t-small mt-1 max-w-md">
            Cross-module performance. Pulse confidence sits next to automation runs and
            AI inference so you read the whole workspace at a glance — not just one module.
          </p>
        </div>
        <Link href="/workspace/modules/pulse/metrics" className="btn-secondary h-9 px-3 text-xs">
          Open metrics
          <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCell label="AI inference"        value={null} hint="LLM calls / day"  icon={Cpu}      tone="violet" />
        <MetricCell label="Automation runs"     value={null} hint="Workflow steps"   icon={Workflow} tone="brand" />
        <MetricCell label="Resolution rate"     value={null} hint="Auto-handled %"   icon={TrendingUp} tone="emerald" />
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <SignalRow label="Operator interventions" value="—" icon={ShieldCheck} />
        <SignalRow label="Median response time"   value="—" icon={Timer} />
        <SignalRow label="Audit events 24h"       value="—" icon={Activity} />
        <SignalRow label="Storage used"           value="—" icon={Database} />
      </div>
    </section>
  );
}

function MetricCell({
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
    <div className="surface-inset relative px-3 py-3">
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

function SignalRow({label, value, icon: Icon}: {label: string; value: string; icon: LucideIcon}) {
  return (
    <div className="surface-inset flex items-center justify-between px-3 py-2.5">
      <span className="inline-flex items-center gap-2">
        <Icon size={13} className="text-zinc-500 dark:text-zinc-500" />
        <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      </span>
      <span className="t-meta">{value}</span>
    </div>
  );
}

// ─── Shortcuts rail ──────────────────────────────────────────────────

function ShortcutsRail() {
  return (
    <section className="surface-rail relative">
      <div className="px-5 pt-5">
        <p className="section-eyebrow">Shortcuts</p>
        <h3 className="t-h3 mt-1">Quick actions</h3>
      </div>
      <ul className="space-y-1 px-3 py-3">
        <ShortcutItem href="/workspace/modules"                    icon={Boxes}        label="Module store"        kbd="g m" />
        <ShortcutItem href="/workspace/agents"                     icon={Bot}          label="Agents"              kbd="g a" />
        <ShortcutItem href="/workspace/activity"                   icon={Activity}     label="Activity log"        kbd="g l" />
        <ShortcutItem href="/workspace/modules/pulse/inbox"        icon={Sparkles}     label="Pulse inbox"         kbd="g i" />
        <ShortcutItem href="/workspace/modules/pulse/playbooks"    icon={Workflow}     label="Playbooks"           kbd="g p" />
        <ShortcutItem href="/workspace/modules/pulse/knowledge"    icon={ClipboardList} label="Knowledge"           kbd="g k" />
        <ShortcutItem href="/workspace/settings"                   icon={Settings2}    label="Workspace settings"  kbd="g s" />
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
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-brand-900/30 dark:group-hover:text-brand-300">
          <Icon size={12} />
        </span>
        <span className="flex-1">{label}</span>
        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600">{kbd}</span>
      </Link>
    </li>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function RailHeader({eyebrow, title, link}: {eyebrow: string; title: string; link?: {href: string; label: string}}) {
  return (
    <div className="flex items-end justify-between gap-4 px-5 pb-3 pt-5">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="t-h3 mt-1">{title}</h2>
      </div>
      {link && (
        <Link href={link.href} className="group inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400">
          {link.label}
          <ArrowRight size={11} className="transition-transform duration-200 ease-snap group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function formatRole(role: string | undefined): string {
  if (!role) return '—';
  // Map ROLE_TOKEN -> "Role Token"
  return role
    .toLowerCase()
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function formatProvider(provider: string): string {
  return provider
    .toLowerCase()
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function dotForStatus(status: PulseChannelRecord['status']): string {
  switch (status) {
    case 'ACTIVE':           return 'bg-emerald-500 animate-pulse-dot';
    case 'NEEDS_ATTENTION':  return 'bg-amber-500';
    case 'DISABLED':
    case 'DISCONNECTED':     return 'bg-zinc-400';
  }
}
