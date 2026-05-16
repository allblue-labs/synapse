'use client';

import {useMemo, useState, useTransition} from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart2,
  Bot,
  Boxes,
  CheckCircle2,
  CircleDashed,
  Eye,
  EyeOff,
  Layers,
  Lock,
  MessageSquare,
  Plug,
  Power,
  PowerOff,
  Search,
  Settings2,
  ShieldCheck,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {Sheet, SheetBody, SheetFooter, SheetSection} from '@/components/ui/sheet';
import {StatusPill, type StatusTone} from '@/components/ui/status-pill';
import {InlineAction} from '@/components/ui/inline-action';
import {AnimatedNumber} from '@/components/ui/animated-number';
import {useToast} from '@/components/ui/toast';
import {cn} from '@/lib/utils';

/**
 * Platform · Modules — operational marketplace governance.
 *
 *   - Operational table with toolbar (search + lifecycle filter chips).
 *   - Row click opens a detail Sheet with lifecycle / visibility /
 *     tier / governance metadata + inline actions.
 *   - Inline row actions (Toggle visibility, Promote / Demote rollout)
 *     placeholder until `platform:modules:manage` mutations land.
 *
 * Stage 7 pattern: operational table + detail side panel + inline
 * actions + realtime states. No CRUD form.
 */

type Lifecycle  = 'DRAFT' | 'PILOT' | 'GA' | 'DEPRECATED';
type Visibility = 'PUBLIC' | 'PRIVATE' | 'HIDDEN';
type Tier       = 'FREE' | 'LIGHT' | 'PRO' | 'PREMIUM';

interface CatalogRow {
  id: string;
  label: string;
  description: string;
  category: 'Operations' | 'AI' | 'Automation' | 'Data' | 'Connectivity';
  icon: LucideIcon;
  lifecycle: Lifecycle;
  visibility: Visibility;
  tiers: ReadonlyArray<Tier>;
  enabledTenants: number | null;
  accent: 'brand' | 'indigo' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose' | 'cyan';
}

const ACCENT: Record<CatalogRow['accent'], {iconBg: string}> = {
  brand:   {iconBg: 'bg-brand-500/15 text-brand-700 dark:text-brand-300'},
  indigo:  {iconBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'},
  amber:   {iconBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300'},
  emerald: {iconBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'},
  sky:     {iconBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300'},
  violet:  {iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300'},
  rose:    {iconBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300'},
  cyan:    {iconBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'},
};

const ROWS: ReadonlyArray<CatalogRow> = [
  {id: 'pulse',        label: 'Pulse',        description: 'Operational comms & workflow engine.',                category: 'Operations',   icon: MessageSquare, lifecycle: 'GA',    visibility: 'PUBLIC',  tiers: ['LIGHT','PRO','PREMIUM'], enabledTenants: null, accent: 'brand'},
  {id: 'agents',       label: 'Agents',       description: 'Custom AI orchestration with tools and knowledge.',   category: 'AI',           icon: Bot,           lifecycle: 'PILOT', visibility: 'PUBLIC',  tiers: ['PRO','PREMIUM'],         enabledTenants: null, accent: 'violet'},
  {id: 'automation',   label: 'Automation',   description: 'Event-driven workflows across modules.',              category: 'Automation',   icon: Workflow,      lifecycle: 'DRAFT', visibility: 'PRIVATE', tiers: ['PRO','PREMIUM'],         enabledTenants: null, accent: 'amber'},
  {id: 'analytics',    label: 'Analytics',    description: 'Outcomes, funnels, and warehouse exports.',            category: 'Data',         icon: BarChart2,     lifecycle: 'DRAFT', visibility: 'HIDDEN',  tiers: ['PREMIUM'],               enabledTenants: null, accent: 'emerald'},
  {id: 'integrations', label: 'Integrations', description: 'Connect CRM, calendars, billing, warehouses.',         category: 'Connectivity', icon: Plug,          lifecycle: 'PILOT', visibility: 'PUBLIC',  tiers: ['LIGHT','PRO','PREMIUM'], enabledTenants: null, accent: 'cyan'},
  {id: 'spark',        label: 'Spark',        description: 'Reactive event-bus triggers from external systems.',   category: 'Automation',   icon: Zap,           lifecycle: 'DRAFT', visibility: 'HIDDEN',  tiers: ['PREMIUM'],               enabledTenants: null, accent: 'rose'},
];

const LIFECYCLE_META: Record<Lifecycle, {label: string; tone: StatusTone; pulse: boolean}> = {
  DRAFT:      {label: 'Draft',  tone: 'zinc',    pulse: false},
  PILOT:      {label: 'Pilot',  tone: 'amber',   pulse: true},
  GA:         {label: 'GA',     tone: 'emerald', pulse: true},
  DEPRECATED: {label: 'Sunset', tone: 'red',     pulse: false},
};

const VIS_META: Record<Visibility, {label: string; icon: LucideIcon; tone: StatusTone}> = {
  PUBLIC:  {label: 'Public',  icon: Eye,    tone: 'emerald'},
  PRIVATE: {label: 'Private', icon: Lock,   tone: 'amber'},
  HIDDEN:  {label: 'Hidden',  icon: EyeOff, tone: 'zinc'},
};

const LIFECYCLE_FILTERS: ReadonlyArray<{value: Lifecycle | 'ALL'; label: string}> = [
  {value: 'ALL',        label: 'All'},
  {value: 'GA',         label: 'GA'},
  {value: 'PILOT',      label: 'Pilot'},
  {value: 'DRAFT',      label: 'Draft'},
  {value: 'DEPRECATED', label: 'Sunset'},
];

// ─── Page ────────────────────────────────────────────────────────────

export default function PlatformModulesPage() {
  const [query, setQuery]       = useState('');
  const [filter, setFilter]     = useState<Lifecycle | 'ALL'>('ALL');
  const [selected, setSelected] = useState<CatalogRow | null>(null);
  const [pending, startTransition] = useTransition();
  const {toast} = useToast();

  const counts = useMemo(() => ({
    GA:         ROWS.filter((r) => r.lifecycle === 'GA').length,
    PILOT:      ROWS.filter((r) => r.lifecycle === 'PILOT').length,
    DRAFT:      ROWS.filter((r) => r.lifecycle === 'DRAFT').length,
    DEPRECATED: ROWS.filter((r) => r.lifecycle === 'DEPRECATED').length,
  }), []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (filter !== 'ALL' && r.lifecycle !== filter) return false;
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q)
        || r.id.toLowerCase().includes(q)
        || r.description.toLowerCase().includes(q)
        || r.category.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  function pretendAction(verb: string, target: string) {
    startTransition(() => {
      window.setTimeout(() => {
        toast({variant: 'info', title: `${verb} requested`, description: `${target} · audited via platform.modules.governance.updated when backend is wired.`});
      }, 350);
    });
  }

  return (
    <div className="stack-page">
      <Hero counts={counts} total={ROWS.length} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <RolloutLadder counts={counts} total={ROWS.length} />
          <GovernanceCard />
        </div>

        <section className="surface-translucent relative overflow-hidden">
          <Toolbar
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
            shown={rows.length}
            total={ROWS.length}
          />
          <CatalogTable
            rows={rows}
            onSelect={setSelected}
            selectedId={selected?.id ?? null}
            pretendAction={pretendAction}
          />
          <p className="border-t border-zinc-200/55 px-6 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/55 dark:text-zinc-500">
            Live catalog ships when <span className="font-mono">GET /v1/platform/modules</span> is exposed.
            Mutations call <span className="font-mono">PATCH /v1/platform/modules/:id</span>.
          </p>
        </section>
      </div>

      <ModuleSheet
        row={selected}
        onClose={() => setSelected(null)}
        pending={pending}
        pretendAction={pretendAction}
      />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero({counts, total}: {counts: Record<Lifecycle, number>; total: number}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/55 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-glass dark:border-zinc-800/55 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25 dark:shadow-glass-dark">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-12 -top-32 h-[360px] w-[360px] rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Boxes size={11} />
            Platform · module catalog
          </p>
          <h1 className="t-h1 mt-3">Govern the marketplace.</h1>
          <p className="t-body mt-3 max-w-lg">
            Lifecycle, visibility, plan tiers, and per-tenant overrides. Rollout the
            catalog like product, not like a CRUD list.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat label="Total" value={total}        tone="indigo"  icon={Layers} />
          <HeroStat label="GA"    value={counts.GA}    tone="emerald" icon={CheckCircle2} stripes={counts.GA > 0} />
          <HeroStat label="Pilot" value={counts.PILOT} tone="amber"   icon={CircleDashed} />
          <HeroStat label="Draft" value={counts.DRAFT} tone="violet"  icon={Settings2} />
        </div>
      </div>
    </section>
  );
}

const HERO_TONE: Record<'indigo' | 'emerald' | 'amber' | 'violet', {text: string; bg: string}> = {
  indigo:  {text: 'text-indigo-700 dark:text-indigo-300',   bg: 'from-indigo-500/15 to-indigo-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
  violet:  {text: 'text-violet-700 dark:text-violet-300',   bg: 'from-violet-500/15 to-violet-500/0'},
};

function HeroStat({label, value, tone, icon: Icon, stripes}: {label: string; value: number; tone: keyof typeof HERO_TONE; icon: LucideIcon; stripes?: boolean}) {
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
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

// ─── Rollout ladder ──────────────────────────────────────────────────

function RolloutLadder({counts, total}: {counts: Record<Lifecycle, number>; total: number}) {
  const stages: ReadonlyArray<Lifecycle> = ['DRAFT', 'PILOT', 'GA', 'DEPRECATED'];
  return (
    <section className="surface-translucent relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <p className="section-eyebrow">Rollout</p>
      <h2 className="t-h3 mt-1">Lifecycle ladder</h2>
      <p className="t-small mt-1">
        Module rollout state across the catalog. Mutations are audited via{' '}
        <span className="font-mono">platform.modules.governance.updated</span>.
      </p>

      <div className="mt-5 space-y-2.5">
        {stages.map((stage) => {
          const count = counts[stage];
          const pct = total === 0 ? 0 : (count / total) * 100;
          const t = LIFECYCLE_META[stage];
          return (
            <div key={stage} className="surface-inset relative overflow-hidden p-3">
              <div className="flex items-center justify-between">
                <StatusPill tone={t.tone} label={t.label} pulse={t.pulse} />
                <span className="font-mono text-[11px] tabular-nums text-zinc-700 dark:text-zinc-300">
                  <AnimatedNumber value={count} /> · {Math.round(pct)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/60">
                <div
                  className={cn('bar-progress h-full',
                    t.tone === 'emerald' && 'bg-emerald-500',
                    t.tone === 'amber'   && 'bg-amber-500',
                    t.tone === 'red'     && 'bg-red-500',
                    t.tone === 'zinc'    && 'bg-zinc-400',
                  )}
                  style={{['--w' as string]: `${pct}%`} as React.CSSProperties}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Governance card ────────────────────────────────────────────────

function GovernanceCard() {
  return (
    <section className="surface-rail relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
          <ShieldCheck size={14} />
        </span>
        <div>
          <p className="t-h3">Audited governance</p>
          <p className="t-meta-xs">Platform-scoped role required</p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        <li>· Lifecycle moves and tier changes write to the audit ledger.</li>
        <li>· Visibility (Public / Private / Hidden) gates client store discovery.</li>
        <li>· Per-tenant overrides land via <span className="font-mono">modules:enable</span> / <span className="font-mono">modules:disable</span>.</li>
      </ul>
      <Link href="/platform/audit" className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        Open audit ledger
        <ArrowUpRight size={11} />
      </Link>
    </section>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────

function Toolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  shown,
  total,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  filter: Lifecycle | 'ALL';
  onFilterChange: (f: Lifecycle | 'ALL') => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200/55 px-6 py-4 dark:border-zinc-800/55">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200/55 bg-white/65 px-3 py-1.5 shadow-soft backdrop-blur dark:border-zinc-800/55 dark:bg-zinc-900/55">
        <Search size={13} className="text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search module, id, category…"
          className="w-56 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {LIFECYCLE_FILTERS.map(({value, label}) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-soft',
                active
                  ? 'border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-800/55 dark:bg-indigo-900/25 dark:text-indigo-300'
                  : 'border-zinc-200/55 bg-white/55 text-zinc-600 hover:bg-white dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-400 dark:hover:bg-zinc-900',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <span className="ml-auto text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-500">
        {shown} / {total}
      </span>
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────

function CatalogTable({
  rows,
  onSelect,
  selectedId,
  pretendAction,
}: {
  rows: ReadonlyArray<CatalogRow>;
  onSelect: (row: CatalogRow) => void;
  selectedId: string | null;
  pretendAction: (verb: string, target: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="m-6 rounded-xl border border-dashed border-zinc-200/55 bg-white/40 p-10 text-center text-xs text-zinc-500 dark:border-zinc-800/55 dark:bg-zinc-900/30 dark:text-zinc-500">
        No modules match the current filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
            <th className="px-6 py-2 font-semibold">Module</th>
            <th className="px-3 py-2 font-semibold">Lifecycle</th>
            <th className="px-3 py-2 font-semibold">Visibility</th>
            <th className="px-3 py-2 font-semibold">Tiers</th>
            <th className="px-3 py-2 font-semibold">Tenants</th>
            <th className="px-6 py-2 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200/55 dark:divide-zinc-800/55">
          {rows.map((row) => {
            const a = ACCENT[row.accent];
            const lc = LIFECYCLE_META[row.lifecycle];
            const vis = VIS_META[row.visibility];
            const VisIcon = vis.icon;
            const isSelected = selectedId === row.id;
            return (
              <tr
                key={row.id}
                onClick={() => onSelect(row)}
                data-selected={isSelected ? 'true' : 'false'}
                className={cn(
                  'group cursor-pointer transition-soft',
                  isSelected
                    ? 'bg-indigo-50/40 dark:bg-indigo-900/15'
                    : 'hover:bg-white/40 dark:hover:bg-zinc-900/40',
                )}
              >
                <td className="px-6 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                      <row.icon size={15} />
                    </span>
                    <div>
                      <p className="t-h3 leading-tight">{row.label}</p>
                      <p className="t-meta-xs">{row.id} · {row.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-middle">
                  <StatusPill tone={lc.tone} label={lc.label} pulse={lc.pulse} />
                </td>
                <td className="px-3 py-3 align-middle">
                  <span className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-medium',
                    vis.tone === 'emerald' && 'text-emerald-700 dark:text-emerald-400',
                    vis.tone === 'amber'   && 'text-amber-700 dark:text-amber-400',
                    vis.tone === 'zinc'    && 'text-zinc-500 dark:text-zinc-500',
                  )}>
                    <VisIcon size={11} />
                    {vis.label}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="flex flex-wrap gap-1">
                    {row.tiers.map((t) => (
                      <span key={t} className="rounded-md border border-zinc-200/55 bg-white/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600 dark:border-zinc-800/55 dark:bg-zinc-900/45 dark:text-zinc-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-middle">
                  <span className="t-meta">
                    {row.enabledTenants == null ? '—' : row.enabledTenants}
                  </span>
                </td>
                <td className="px-6 py-3 text-right align-middle">
                  <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {row.visibility === 'HIDDEN' ? (
                      <InlineAction
                        tone="primary"
                        icon={<Eye size={11} />}
                        onClick={() => pretendAction('Reveal', row.label)}
                      >
                        Reveal
                      </InlineAction>
                    ) : (
                      <InlineAction
                        tone="neutral"
                        icon={<EyeOff size={11} />}
                        onClick={() => pretendAction('Hide', row.label)}
                      >
                        Hide
                      </InlineAction>
                    )}
                    <InlineAction
                      tone="neutral"
                      icon={<ArrowUpRight size={11} />}
                      onClick={() => onSelect(row)}
                    >
                      Inspect
                    </InlineAction>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail sheet ────────────────────────────────────────────────────

function ModuleSheet({
  row,
  onClose,
  pending,
  pretendAction,
}: {
  row: CatalogRow | null;
  onClose: () => void;
  pending: boolean;
  pretendAction: (verb: string, target: string) => void;
}) {
  const open = row !== null;
  if (!row) {
    return <Sheet open={open} onClose={onClose} title="Module detail" width="lg">{null}</Sheet>;
  }

  const lc = LIFECYCLE_META[row.lifecycle];
  const vis = VIS_META[row.visibility];
  const VisIcon = vis.icon;
  const a = ACCENT[row.accent];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={row.label}
      description={`${row.id} · ${row.category}`}
      width="lg"
      dismissable={!pending}
    >
      <SheetBody>
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <StatusPill tone={lc.tone} label={lc.label} pulse={lc.pulse} size="md" />
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
            vis.tone === 'emerald' && 'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/55 dark:bg-emerald-900/25 dark:text-emerald-300',
            vis.tone === 'amber'   && 'border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-800/55 dark:bg-amber-900/25 dark:text-amber-300',
            vis.tone === 'zinc'    && 'border-zinc-200/70 bg-white/60 text-zinc-600 dark:border-zinc-700/55 dark:bg-zinc-800/55 dark:text-zinc-400',
          )}>
            <VisIcon size={11} />
            {vis.label}
          </span>
        </div>

        <SheetSection eyebrow="About" title="What this module does">
          <p className="t-body">{row.description}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${a.iconBg}`}>
              <row.icon size={17} />
            </span>
            <p className="t-meta">{row.category}</p>
          </div>
        </SheetSection>

        <SheetSection eyebrow="Plan tiers" title="Available on">
          <div className="flex flex-wrap gap-2">
            {(['FREE', 'LIGHT', 'PRO', 'PREMIUM'] as const).map((tier) => {
              const included = row.tiers.includes(tier);
              return (
                <span
                  key={tier}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-medium',
                    included
                      ? 'border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-800/55 dark:bg-indigo-900/25 dark:text-indigo-300'
                      : 'border-zinc-200/55 bg-zinc-50/40 text-zinc-400 dark:border-zinc-800/55 dark:bg-zinc-900/30 dark:text-zinc-600',
                  )}
                >
                  {included && <CheckCircle2 size={10} />}
                  {tier}
                </span>
              );
            })}
          </div>
        </SheetSection>

        <SheetSection eyebrow="Governance" title="Audited operations">
          <p className="t-small">
            Lifecycle changes (Draft → Pilot → GA → Sunset), visibility toggles, and
            per-tenant overrides write to the audit ledger under{' '}
            <span className="font-mono">platform.modules.governance.updated</span>.
          </p>
        </SheetSection>
      </SheetBody>

      <SheetFooter>
        <InlineAction
          tone="neutral"
          size="md"
          icon={<ShieldCheck size={12} />}
          onClick={() => pretendAction('Audit lookup', row.label)}
        >
          Audit history
        </InlineAction>
        <span className="flex-1" />
        {row.visibility === 'HIDDEN' ? (
          <InlineAction
            tone="primary"
            size="md"
            pending={pending}
            icon={<Power size={12} />}
            onClick={() => pretendAction('Reveal', row.label)}
          >
            Reveal module
          </InlineAction>
        ) : (
          <InlineAction
            tone="danger"
            size="md"
            pending={pending}
            icon={<PowerOff size={12} />}
            onClick={() => pretendAction('Hide', row.label)}
          >
            Hide module
          </InlineAction>
        )}
      </SheetFooter>
    </Sheet>
  );
}
