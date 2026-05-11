import Link from 'next/link';
import type {Metadata} from 'next';
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  ChartColumn,
  ChartSpline,
  ChevronRight,
  Cpu,
  Inbox,
  Plug,
  Search,
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

export const metadata: Metadata = {title: 'Overview'};

const AI_USAGE_POINTS = [22, 28, 24, 35, 38, 42, 39, 48, 52, 58, 61, 68] as const;

type Tone = 'brand' | 'amber' | 'emerald' | 'zinc' | 'violet';

interface SignalMetric {
  label: string;
  value: string | number;
  hint: string;
  tone: Tone;
}

interface OperationRow {
  row: PulseTicketRow;
  lane: string;
  tone: Tone;
}

const TONE_TEXT: Record<Tone, string> = {
  brand: 'text-brand-700 dark:text-brand-300',
  amber: 'text-amber-700 dark:text-amber-400',
  emerald: 'text-emerald-700 dark:text-emerald-400',
  zinc: 'text-zinc-900 dark:text-zinc-100',
  violet: 'text-violet-700 dark:text-violet-300',
};

const TONE_DOT: Record<Tone, string> = {
  brand: 'bg-brand-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  zinc: 'bg-zinc-500',
  violet: 'bg-violet-500',
};

export default async function OverviewPage() {
  const inbox = await loadInboxLanes();
  const ok = inbox.kind === 'ok' ? inbox.data : null;

  const needsReview = ok?.needsReview.length ?? 0;
  const inFlow = ok?.open.length ?? 0;
  const waiting = ok?.waiting.length ?? 0;
  const totalLive = needsReview + inFlow + waiting;

  const operationRows: ReadonlyArray<OperationRow> = ok
    ? [
        ...ok.needsReview.map((row) => ({row, lane: 'Needs review', tone: 'amber' as const})),
        ...ok.open.map((row) => ({row, lane: 'In flow', tone: 'brand' as const})),
        ...ok.waiting.map((row) => ({row, lane: 'Waiting customer', tone: 'zinc' as const})),
      ].slice(0, 14)
    : [];

  const signals: ReadonlyArray<SignalMetric> = [
    {label: 'Live items', value: totalLive, hint: 'Pulse runtime', tone: 'brand'},
    {label: 'Needs review', value: needsReview, hint: 'operator action', tone: 'amber'},
    {label: 'In flow', value: inFlow, hint: 'active tickets', tone: 'violet'},
    {label: 'Waiting', value: waiting, hint: 'customer response', tone: 'zinc'},
    {label: 'Resolved 24h', value: '—', hint: 'pending metrics', tone: 'emerald'},
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-[1920px] px-3 pb-8 pt-3 sm:px-4 lg:px-5">
        <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/40">
          <div className="flex flex-col gap-4 border-b border-zinc-200/70 px-4 py-4 dark:border-zinc-800/80 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Synapse control plane
              </div>

              <h1 className="mt-2 text-[1.6rem] font-semibold tracking-[-0.045em] text-zinc-950 dark:text-zinc-50 sm:text-[1.9rem]">
                Operational intelligence workspace
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Runtime signal for Pulse, AI agents, workflow execution and customer operations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TopAction href="/workspace/modules/pulse/inbox" icon={Inbox} label="Inbox" primary />
              <TopAction href="/workspace/modules" icon={Boxes} label="Modules" />
              <Can permission="agents:write">
                <TopAction href="/workspace/agents" icon={Bot} label="Agents" />
              </Can>
            </div>
          </div>

          <div className="grid divide-y divide-zinc-200/70 dark:divide-zinc-800/80 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
            {signals.map((signal) => (
              <SignalItem key={signal.label} {...signal} />
            ))}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 space-y-4">
            <AiUsagePanel />

            <OperationsStream rows={operationRows} fallbackKind={inbox.kind} />
          </main>

          <aside className="space-y-4">
            <RuntimeRail />
            <ShortcutRail />
          </aside>
        </section>
      </div>
    </div>
  );
}

function TopAction({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string;
  icon: typeof Inbox;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? 'inline-flex h-9 items-center gap-2 rounded-xl bg-zinc-950 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200'
          : 'inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200/70 bg-white/70 px-3.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-zinc-700'
      }
    >
      <Icon size={13} />
      {label}
    </Link>
  );
}

function SignalItem({label, value, hint, tone}: SignalMetric) {
  return (
    <div className="relative min-h-[104px] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </span>
        <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
      </div>

      <div className={`mt-4 text-[1.75rem] font-semibold leading-none tracking-[-0.06em] ${TONE_TEXT[tone]}`}>
        {value}
      </div>

      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

function AiUsagePanel() {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/40">
      <div className="flex flex-col gap-3 border-b border-zinc-200/70 px-4 py-4 dark:border-zinc-800/80 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <Sparkles size={12} className="text-brand-500" />
            AI usage
          </div>

          <h2 className="mt-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Runtime inference telemetry
          </h2>
        </div>

        <div className="relative">
          <input id="chart-line" name="ai-chart-mode" type="radio" defaultChecked className="peer/line sr-only" />
          <input id="chart-bars" name="ai-chart-mode" type="radio" className="peer/bars sr-only" />

          <div className="inline-flex rounded-xl border border-zinc-200/70 bg-zinc-100/70 p-1 dark:border-zinc-800 dark:bg-zinc-900/70">
            <label
              htmlFor="chart-line"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-colors peer-checked/line:bg-white peer-checked/line:text-zinc-950 peer-checked/line:shadow-sm dark:peer-checked/line:bg-zinc-800 dark:peer-checked/line:text-zinc-100"
            >
              <ChartSpline size={13} />
              Line
            </label>

            <label
              htmlFor="chart-bars"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-colors peer-checked/bars:bg-white peer-checked/bars:text-zinc-950 peer-checked/bars:shadow-sm dark:peer-checked/bars:bg-zinc-800 dark:peer-checked/bars:text-zinc-100"
            >
              <ChartColumn size={13} />
              Bars
            </label>
          </div>

          <div className="peer-checked/line:block peer-checked/bars:hidden hidden" />
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="border-b border-zinc-200/70 p-4 dark:border-zinc-800/80 lg:border-b-0 lg:border-r">
          <div className="relative h-[260px] overflow-hidden rounded-xl bg-zinc-50/80 dark:bg-zinc-900/40">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(113,113,122,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(113,113,122,0.10)_1px,transparent_1px)] bg-[size:48px_48px]" />

            <div className="absolute inset-0 peer-checked/line:block">
              <LineChart points={AI_USAGE_POINTS} />
            </div>

            <div className="absolute inset-0 hidden peer-checked/bars:block">
              <BarChart points={AI_USAGE_POINTS} />
            </div>
          </div>
        </div>

        <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
          <AiStat label="Inference" value="—" hint="LLM calls / day" icon={Cpu} />
          <AiStat label="Automations" value="—" hint="Steps executed" icon={Workflow} />
          <AiStat label="Confidence" value="—" hint="Median per skill" icon={ShieldCheck} />
        </div>
      </div>
    </section>
  );
}

function LineChart({points}: {points: ReadonlyArray<number>}) {
  const width = 720;
  const height = 260;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const coords = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / Math.max(1, max - min)) * 160 - 48;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="3" className="text-brand-500" />
      <polyline points={`${coords} ${width},260 0,260`} fill="currentColor" className="text-brand-500/10" />
    </svg>
  );
}

function BarChart({points}: {points: ReadonlyArray<number>}) {
  return (
    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end gap-2 px-6 pb-6">
      {points.map((value, index) => (
        <div key={index} className="flex-1 rounded-t-lg bg-gradient-to-t from-brand-500/85 to-cyan-400/80" style={{height: `${value}%`}} />
      ))}
    </div>
  );
}

function AiStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Cpu;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/70 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/60">
        <Icon size={15} className="text-zinc-600 dark:text-zinc-300" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {label}
        </div>
        <div className="mt-1 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {value}
        </div>
        <div className="text-xs text-zinc-500">{hint}</div>
      </div>
    </div>
  );
}

function OperationsStream({
  rows,
  fallbackKind,
}: {
  rows: ReadonlyArray<OperationRow>;
  fallbackKind: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between border-b border-zinc-200/70 px-4 py-4 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <Activity size={12} className="text-emerald-500" />
            Operational stream
          </div>
          <h2 className="mt-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Live runtime activity
          </h2>
        </div>

        <Link href="/workspace/modules/pulse/inbox" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100">
          Open inbox
          <ArrowRight size={13} />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-10 text-sm text-zinc-500">
          {fallbackKind === 'forbidden'
            ? 'You don’t have permission to view Pulse tickets.'
            : fallbackKind === 'error'
              ? 'No live signal available right now.'
              : 'No live items. Pulse will surface activity here.'}
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {rows.map(({row, lane}) => (
            <Link
              key={row.id}
              href={`/workspace/modules/pulse/tickets/${row.id}`}
              className="group grid gap-3 px-4 py-3 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 sm:grid-cols-[120px_minmax(0,1fr)_140px]"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className={`h-1.5 w-1.5 rounded-full ${row.needsReview ? 'bg-amber-500' : 'bg-brand-500'}`} />
                {lane}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {row.customer.displayName ?? row.customer.handle}
                </div>
                <div className="mt-0.5 truncate text-xs text-zinc-500">
                  {row.preview || `${row.skill.toLowerCase()} · ${row.priority.toLowerCase()}`}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                <span className="font-mono">{row.status.toLowerCase().replace('_', ' ')}</span>
                <ChevronRight size={14} className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function RuntimeRail() {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/40">
      <div className="border-b border-zinc-200/70 px-4 py-4 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          <Zap size={12} className="text-emerald-500" />
          Runtime
        </div>
        <h2 className="mt-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          System health
        </h2>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {['Messaging cluster', 'AI runtime', 'Workflow engine', 'Queue workers', 'Telemetry stream'].map((item) => (
          <div key={item} className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{item}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Healthy
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShortcutRail() {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/40">
      <div className="border-b border-zinc-200/70 px-4 py-4 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          <Search size={12} className="text-brand-500" />
          Command rail
        </div>
        <h2 className="mt-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Quick access
        </h2>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        <Shortcut href="/workspace/modules/pulse/inbox" icon={Inbox} label="Pulse inbox" />
        <Shortcut href="/workspace/modules/pulse/tickets" icon={Ticket} label="Search tickets" />
        <Shortcut href="/workspace/modules/pulse/integrations" icon={Plug} label="Integrations" />
        <Shortcut href="/workspace/modules" icon={Boxes} label="Module store" />
        <Shortcut href="/workspace/settings" icon={Cpu} label="Settings" />
      </div>
    </section>
  );
}

function Shortcut({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Inbox;
  label: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200/70 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/60">
        <Icon size={14} className="text-zinc-600 dark:text-zinc-300" />
      </div>
      <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      <ChevronRight size={14} className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}