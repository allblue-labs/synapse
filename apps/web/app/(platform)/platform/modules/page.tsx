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
  Settings2,
  ShieldCheck,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Modules — Platform'};

/**
 * Platform module catalog — admin-side marketplace management.
 *
 *   - Admins see lifecycle (Draft → Pilot → GA → Deprecated), tier, and
 *     visibility per module. Mutations land on the backend's audited
 *     governance endpoints; this page wires reads + drilldown today.
 *   - Layered surfaces, asymmetric grid: rollout summary + lifecycle
 *     ladder on the left, operational catalog table on the right.
 */

type Lifecycle = 'DRAFT' | 'PILOT' | 'GA' | 'DEPRECATED';
type Visibility = 'PUBLIC' | 'PRIVATE' | 'HIDDEN';
type Tier = 'FREE' | 'LIGHT' | 'PRO' | 'PREMIUM';

interface CatalogRow {
  id: string;
  label: string;
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
  {id: 'pulse',       label: 'Pulse',       category: 'Operations',   icon: MessageSquare, lifecycle: 'GA',    visibility: 'PUBLIC',  tiers: ['LIGHT','PRO','PREMIUM'],         enabledTenants: null, accent: 'brand'},
  {id: 'agents',      label: 'Agents',      category: 'AI',           icon: Bot,           lifecycle: 'PILOT', visibility: 'PUBLIC',  tiers: ['PRO','PREMIUM'],                  enabledTenants: null, accent: 'violet'},
  {id: 'automation',  label: 'Automation',  category: 'Automation',   icon: Workflow,      lifecycle: 'DRAFT', visibility: 'PRIVATE', tiers: ['PRO','PREMIUM'],                  enabledTenants: null, accent: 'amber'},
  {id: 'analytics',   label: 'Analytics',   category: 'Data',         icon: BarChart2,     lifecycle: 'DRAFT', visibility: 'HIDDEN',  tiers: ['PREMIUM'],                        enabledTenants: null, accent: 'emerald'},
  {id: 'integrations',label: 'Integrations',category: 'Connectivity', icon: Plug,          lifecycle: 'PILOT', visibility: 'PUBLIC',  tiers: ['LIGHT','PRO','PREMIUM'],         enabledTenants: null, accent: 'cyan'},
  {id: 'spark',       label: 'Spark',       category: 'Automation',   icon: Zap,           lifecycle: 'DRAFT', visibility: 'HIDDEN',  tiers: ['PREMIUM'],                        enabledTenants: null, accent: 'rose'},
];

const LIFECYCLE_TONE: Record<Lifecycle, {label: string; cls: string; dot: string}> = {
  DRAFT:      {label: 'Draft',     cls: 'border-zinc-200 bg-white/60 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400',                    dot: 'bg-zinc-400'},
  PILOT:      {label: 'Pilot',     cls: 'border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-400',     dot: 'bg-amber-500'},
  GA:         {label: 'GA',        cls: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500'},
  DEPRECATED: {label: 'Sunset',    cls: 'border-red-200/80 bg-red-50/80 text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-400',                  dot: 'bg-red-500'},
};

const VIS_TONE: Record<Visibility, {label: string; icon: LucideIcon; cls: string}> = {
  PUBLIC:  {label: 'Public',  icon: Eye,    cls: 'text-emerald-700 dark:text-emerald-400'},
  PRIVATE: {label: 'Private', icon: Lock,   cls: 'text-amber-700 dark:text-amber-400'},
  HIDDEN:  {label: 'Hidden',  icon: EyeOff, cls: 'text-zinc-500 dark:text-zinc-500'},
};

export default function PlatformModulesPage() {
  const counts = {
    GA:         ROWS.filter((r) => r.lifecycle === 'GA').length,
    PILOT:      ROWS.filter((r) => r.lifecycle === 'PILOT').length,
    DRAFT:      ROWS.filter((r) => r.lifecycle === 'DRAFT').length,
    DEPRECATED: ROWS.filter((r) => r.lifecycle === 'DEPRECATED').length,
  };

  return (
    <div className="space-y-10">
      <Hero counts={counts} total={ROWS.length} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <RolloutLadder counts={counts} total={ROWS.length} />
          <GovernanceCard />
        </div>
        <CatalogTable rows={ROWS} />
      </div>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero({counts, total}: {counts: Record<Lifecycle, number>; total: number}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-soft dark:border-zinc-800/70 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-12 -top-32 h-[360px] w-[360px] rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Boxes size={11} />
            Platform · module catalog
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-zinc-50 sm:text-[2.25rem]">
            Govern the marketplace.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Lifecycle, visibility, plan tiers, and per-tenant overrides. Rollout the catalog like product, not like a CRUD list.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat label="Total"   value={total}            tone="indigo"  icon={Layers} />
          <HeroStat label="GA"      value={counts.GA}        tone="emerald" icon={CheckCircle2} stripes={counts.GA > 0} />
          <HeroStat label="Pilot"   value={counts.PILOT}     tone="amber"   icon={CircleDashed} />
          <HeroStat label="Draft"   value={counts.DRAFT}     tone="violet"  icon={Settings2} />
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
      <p className={`relative mt-3 text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>{value}</p>
    </div>
  );
}

// ─── Rollout ladder (left rail) ─────────────────────────────────────

function RolloutLadder({counts, total}: {counts: Record<Lifecycle, number>; total: number}) {
  const stages: ReadonlyArray<Lifecycle> = ['DRAFT', 'PILOT', 'GA', 'DEPRECATED'];
  return (
    <section className="surface-translucent relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <p className="section-eyebrow">Rollout</p>
      <h2 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Lifecycle ladder</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
        Module rollout state across the catalog. Mutations are audited via <span className="font-mono">platform.modules.governance.updated</span>.
      </p>

      <ul className="mt-5 space-y-2.5">
        {stages.map((stage) => {
          const count = counts[stage];
          const pct = total === 0 ? 0 : (count / total) * 100;
          const t = LIFECYCLE_TONE[stage];
          return (
            <li key={stage} className="surface-inset relative overflow-hidden p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${t.dot} ${stage === 'GA' || stage === 'PILOT' ? 'animate-pulse-dot' : ''}`} />
                  <span className={`text-xs font-semibold ${t.cls.split(' ').filter((c) => c.startsWith('text-')).join(' ')}`}>{t.label}</span>
                </span>
                <span className="font-mono text-[11px] tabular-nums text-zinc-700 dark:text-zinc-300">{count} · {Math.round(pct)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/60">
                <div
                  className={`bar-progress h-full ${t.dot}`}
                  style={{['--w' as string]: `${pct}%`} as React.CSSProperties}
                />
              </div>
            </li>
          );
        })}
      </ul>
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
          <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Audited governance</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-500">Platform-scoped role required</p>
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

// ─── Catalog table (right, dense) ───────────────────────────────────

function CatalogTable({rows}: {rows: ReadonlyArray<CatalogRow>}) {
  return (
    <section className="surface-translucent overflow-hidden">
      <div className="flex items-end justify-between gap-4 px-6 pt-5">
        <div>
          <p className="section-eyebrow">Catalog</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">All modules</h2>
        </div>
        <span className="text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-500">{rows.length} entries</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
              <th className="px-6 py-2 font-semibold">Module</th>
              <th className="px-3 py-2 font-semibold">Lifecycle</th>
              <th className="px-3 py-2 font-semibold">Visibility</th>
              <th className="px-3 py-2 font-semibold">Plan tiers</th>
              <th className="px-3 py-2 font-semibold">Tenants</th>
              <th className="px-6 py-2 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {rows.map((r) => {
              const a = ACCENT[r.accent];
              const lc = LIFECYCLE_TONE[r.lifecycle];
              const v = VIS_TONE[r.visibility];
              const VIcon = v.icon;
              return (
                <tr key={r.id} className="group transition-colors duration-150 ease-snap hover:bg-white/40 dark:hover:bg-zinc-900/40">
                  <td className="px-6 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                        <r.icon size={15} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{r.label}</p>
                        <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600">{r.id} · {r.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${lc.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${lc.dot}`} />
                      {lc.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${v.cls}`}>
                      <VIcon size={11} />
                      {v.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex flex-wrap gap-1">
                      {r.tiers.map((t) => (
                        <span key={t} className="rounded-md border border-zinc-200/60 bg-white/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="font-mono text-[11px] tabular-nums text-zinc-700 dark:text-zinc-300">
                      {r.enabledTenants == null ? '—' : r.enabledTenants}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right align-middle">
                    <Link
                      href={`#${r.id}`}
                      aria-label={`Manage ${r.label}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/60 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition-all duration-150 ease-snap hover:-translate-y-px hover:bg-white dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Manage
                      <ArrowUpRight size={11} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-zinc-100 px-6 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-500">
        Mutations call <span className="font-mono">PATCH /v1/platform/modules/:id</span>; reads pending the catalog API surface.
      </div>
    </section>
  );
}
