'use client';

import {useMemo, useState, useTransition} from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Bot,
  Boxes,
  Check,
  CheckCircle2,
  Compass,
  CreditCard,
  Lock,
  MessageSquare,
  Plug,
  Power,
  PowerOff,
  Settings2,
  Sparkles,
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
 * Client module store — cloud marketplace.
 *
 *   - Hero: workspace plan, installed count, available count.
 *   - Active in workspace: the modules the tenant has actually
 *     installed, with onboarding progress.
 *   - Catalog: browse + filter by category. Each card carries
 *     status (Live / Beta / Soon), plan tier, install / manage
 *     inline action.
 *   - Plan comparison: which modules each plan unlocks.
 *   - Roadmap: a denser rail of upcoming modules.
 *   - Detail Sheet (Stage-7 primitive) opens on row select with
 *     About / Features / Plan tiers / Onboarding state /
 *     Install / Manage actions.
 *
 * Mutations today are placeholders. `pretendAction()` toasts the
 * audit event that will land when the real backend client ships.
 */

type Status = 'active' | 'beta' | 'soon';
type Tier   = 'FREE' | 'LIGHT' | 'PRO' | 'PREMIUM';
type Pricing = 'Included' | 'Add-on' | 'On roadmap';

interface OnboardingStep {
  label: string;
  done: boolean;
}

interface CatalogModule {
  id: string;
  label: string;
  tagline: string;
  description: string;
  href: string;
  icon: LucideIcon;
  category: 'Operations' | 'AI' | 'Automation' | 'Data' | 'Connectivity';
  status: Status;
  pricing: Pricing;
  tiers: ReadonlyArray<Tier>;
  features: ReadonlyArray<string>;
  installed: boolean;
  onboarding: ReadonlyArray<OnboardingStep>;
  accent: 'brand' | 'indigo' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose' | 'cyan';
  highlight?: boolean;
}

const ACCENT: Record<CatalogModule['accent'], {iconBg: string; halo: string; ring: string}> = {
  brand:   {iconBg: 'bg-brand-500/15 text-brand-700 dark:text-brand-300',      halo: 'from-brand-500/20 via-brand-500/5 to-transparent',     ring: 'ring-brand-200/60 dark:ring-brand-800/60'},
  indigo:  {iconBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',   halo: 'from-indigo-500/20 via-indigo-500/5 to-transparent',   ring: 'ring-indigo-200/60 dark:ring-indigo-800/60'},
  amber:   {iconBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',      halo: 'from-amber-500/20 via-amber-500/5 to-transparent',     ring: 'ring-amber-200/60 dark:ring-amber-800/60'},
  emerald: {iconBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',halo: 'from-emerald-500/20 via-emerald-500/5 to-transparent', ring: 'ring-emerald-200/60 dark:ring-emerald-800/60'},
  sky:     {iconBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',            halo: 'from-sky-500/20 via-sky-500/5 to-transparent',         ring: 'ring-sky-200/60 dark:ring-sky-800/60'},
  violet:  {iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',   halo: 'from-violet-500/20 via-violet-500/5 to-transparent',   ring: 'ring-violet-200/60 dark:ring-violet-800/60'},
  rose:    {iconBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',         halo: 'from-rose-500/20 via-rose-500/5 to-transparent',       ring: 'ring-rose-200/60 dark:ring-rose-800/60'},
  cyan:    {iconBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',         halo: 'from-cyan-500/20 via-cyan-500/5 to-transparent',       ring: 'ring-cyan-200/60 dark:ring-cyan-800/60'},
};

const CATALOG: ReadonlyArray<CatalogModule> = [
  {
    id: 'pulse',
    label: 'Pulse',
    tagline: 'Operational comms & workflow',
    description: 'Inbox, tickets, timeline and playbooks. AI extraction routes inbound items through skills; humans review only where it matters.',
    href: '/workspace/modules/pulse',
    icon: MessageSquare,
    category: 'Operations',
    status: 'active',
    pricing: 'Included',
    tiers: ['LIGHT', 'PRO', 'PREMIUM'],
    features: ['Operator queue', 'Confidence routing', 'Operator review', 'Audit timeline'],
    installed: true,
    onboarding: [
      {label: 'Connect a channel',         done: false},
      {label: 'Publish a knowledge context', done: false},
      {label: 'Define a playbook',         done: false},
      {label: 'Invite your first operator', done: true},
    ],
    accent: 'brand',
    highlight: true,
  },
  {
    id: 'agents',
    label: 'Agents',
    tagline: 'AI orchestration',
    description: 'Define agents with tools, knowledge and guardrails. Deploy across channels and monitor every step.',
    href: '/workspace/agents',
    icon: Bot,
    category: 'AI',
    status: 'active',
    pricing: 'Included',
    tiers: ['PRO', 'PREMIUM'],
    features: ['Custom prompts', 'Knowledge base', 'Tool calling'],
    installed: true,
    onboarding: [
      {label: 'Create your first agent',   done: false},
      {label: 'Bind tools and knowledge',  done: false},
      {label: 'Deploy to a Pulse channel', done: false},
    ],
    accent: 'violet',
  },
  {
    id: 'automation',
    label: 'Automation',
    tagline: 'Event-driven flows',
    description: 'Build workflows that execute across modules. Triggers, conditions, and human-in-the-loop approvals.',
    href: '#',
    icon: Workflow,
    category: 'Automation',
    status: 'beta',
    pricing: 'Add-on',
    tiers: ['PRO', 'PREMIUM'],
    features: ['Triggers', 'Conditions', 'Webhooks'],
    installed: false,
    onboarding: [
      {label: 'Install Automation',       done: false},
      {label: 'Build your first flow',    done: false},
      {label: 'Wire a Pulse trigger',     done: false},
    ],
    accent: 'amber',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    tagline: 'Outcomes & insights',
    description: 'Track conversation outcomes, agent performance, and conversions. Export to your warehouse.',
    href: '#',
    icon: BarChart2,
    category: 'Data',
    status: 'soon',
    pricing: 'Add-on',
    tiers: ['PREMIUM'],
    features: ['Real-time metrics', 'Funnels', 'BQ / Snowflake'],
    installed: false,
    onboarding: [],
    accent: 'emerald',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    tagline: 'Connected systems',
    description: 'Connect your CRM, calendar, billing, and data warehouse. Two-way sync with audit trails.',
    href: '#',
    icon: Plug,
    category: 'Connectivity',
    status: 'soon',
    pricing: 'Included',
    tiers: ['LIGHT', 'PRO', 'PREMIUM'],
    features: ['CRM sync', 'Calendars', 'Webhooks'],
    installed: false,
    onboarding: [],
    accent: 'cyan',
  },
  {
    id: 'spark',
    label: 'Spark',
    tagline: 'Real-time triggers',
    description: 'Reactive triggers from external systems. Forward events into agents or workflows in real time.',
    href: '#',
    icon: Zap,
    category: 'Automation',
    status: 'soon',
    pricing: 'On roadmap',
    tiers: ['PREMIUM'],
    features: ['Event bus', 'Replay', 'Schema registry'],
    installed: false,
    onboarding: [],
    accent: 'rose',
  },
];

const STATUS_META: Record<Status, {label: string; tone: StatusTone; pulse: boolean}> = {
  active: {label: 'Live',  tone: 'emerald', pulse: true},
  beta:   {label: 'Beta',  tone: 'amber',   pulse: false},
  soon:   {label: 'Soon',  tone: 'zinc',    pulse: false},
};

const TIER_META: Record<Tier, {label: string; tone: StatusTone}> = {
  FREE:    {label: 'Free',    tone: 'zinc'},
  LIGHT:   {label: 'Light',   tone: 'sky'},
  PRO:     {label: 'Pro',     tone: 'indigo'},
  PREMIUM: {label: 'Premium', tone: 'violet'},
};

const CATEGORY_FILTERS: ReadonlyArray<{value: CatalogModule['category'] | 'ALL'; label: string}> = [
  {value: 'ALL',          label: 'All'},
  {value: 'Operations',   label: 'Operations'},
  {value: 'AI',           label: 'AI'},
  {value: 'Automation',   label: 'Automation'},
  {value: 'Data',         label: 'Data'},
  {value: 'Connectivity', label: 'Connectivity'},
];

// ─── Page ────────────────────────────────────────────────────────────

export default function ModulesStorePage() {
  const [category, setCategory] = useState<CatalogModule['category'] | 'ALL'>('ALL');
  const [selected, setSelected] = useState<CatalogModule | null>(null);
  const [pending, startTransition] = useTransition();
  const {toast} = useToast();

  const installed = useMemo(() => CATALOG.filter((m) => m.installed), []);
  const available = useMemo(() => CATALOG.filter((m) => !m.installed && m.status !== 'soon'), []);
  const roadmap   = useMemo(() => CATALOG.filter((m) => m.status === 'soon'), []);

  const browse = useMemo(() => {
    if (category === 'ALL') return CATALOG;
    return CATALOG.filter((m) => m.category === category);
  }, [category]);

  function pretendAction(verb: string, target: string) {
    startTransition(() => {
      window.setTimeout(() => {
        toast({
          variant: 'info',
          title: `${verb} requested`,
          description: `${target} · install/uninstall API wires up under modules:enable / modules:disable.`,
        });
      }, 350);
    });
  }

  return (
    <div className="stack-page">
      <Hero installed={installed.length} available={available.length} catalog={CATALOG.length} />

      {installed.length > 0 && (
        <ActiveSection
          modules={installed}
          onSelect={setSelected}
        />
      )}

      <CatalogSection
        category={category}
        onCategoryChange={setCategory}
        modules={browse}
        onSelect={setSelected}
        pretendAction={pretendAction}
      />

      <PlanComparison />

      {roadmap.length > 0 && (
        <RoadmapRail modules={roadmap} onSelect={setSelected} />
      )}

      <ModuleSheet
        module={selected}
        onClose={() => setSelected(null)}
        pending={pending}
        pretendAction={pretendAction}
      />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero({installed, available, catalog}: {installed: number; available: number; catalog: number}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/55 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-glass dark:border-zinc-800/55 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25 dark:shadow-glass-dark">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-12 -top-32 h-[360px] w-[360px] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-[-7rem] h-[280px] w-[280px] rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <Compass size={11} />
            Module store
          </p>
          <h1 className="t-h1 mt-3">Discover, install, upgrade.</h1>
          <p className="t-body mt-3 max-w-lg">
            A platform marketplace, not a catalog of static apps. Browse modules, see
            which plan unlocks each one, and activate them with a single inline action.
            Onboarding state stays visible so you know what&apos;s left to set up.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <StatusPill tone="indigo" label="Plan · Pro" size="md" />
            <Link href="/pricing" className="btn-secondary h-9 px-3 text-xs">
              <CreditCard size={12} />
              Manage plan
            </Link>
            <Link href="#catalog" className="btn-ghost h-9 px-3 text-xs">
              Browse catalog
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <HeroStat label="Installed" value={installed} tone="emerald" pulse />
          <HeroStat label="Available" value={available} tone="brand" />
          <HeroStat label="Catalog"   value={catalog}   tone="violet" />
        </div>
      </div>
    </section>
  );
}

const HERO_TONE: Record<'brand' | 'violet' | 'emerald' | 'amber' | 'indigo', {text: string; bg: string}> = {
  brand:   {text: 'text-brand-700 dark:text-brand-300',     bg: 'from-brand-500/15 to-brand-500/0'},
  violet:  {text: 'text-violet-700 dark:text-violet-300',   bg: 'from-violet-500/15 to-violet-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
  indigo:  {text: 'text-indigo-700 dark:text-indigo-300',   bg: 'from-indigo-500/15 to-indigo-500/0'},
};

function HeroStat({label, value, tone, pulse}: {label: string; value: number; tone: keyof typeof HERO_TONE; pulse?: boolean}) {
  const t = HERO_TONE[tone];
  return (
    <div className="surface-dock relative overflow-hidden p-4">
      {pulse && <div aria-hidden="true" className="pointer-events-none absolute inset-0 stripes-pulse opacity-25" />}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b ${t.bg} opacity-70`} />
      <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{label}</p>
      <p className={`relative mt-1 text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

// ─── Active section (installed modules + onboarding progress) ───────

function ActiveSection({modules, onSelect}: {modules: ReadonlyArray<CatalogModule>; onSelect: (m: CatalogModule) => void}) {
  return (
    <section>
      <RailHeader eyebrow="Installed" title="Active in your workspace" />
      <div className="grid gap-3 stagger-children md:grid-cols-2">
        {modules.map((m) => <InstalledCard key={m.id} module={m} onSelect={onSelect} />)}
      </div>
    </section>
  );
}

function InstalledCard({module: m, onSelect}: {module: CatalogModule; onSelect: (m: CatalogModule) => void}) {
  const a = ACCENT[m.accent];
  const total = m.onboarding.length;
  const done  = m.onboarding.filter((s) => s.done).length;
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  const fullySet = done === total;

  return (
    <article className="animate-slide-up surface-translucent relative flex flex-col overflow-hidden p-5">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.halo} opacity-70`} />

      <header className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.iconBg} ring-2 ${a.ring}`}>
            <m.icon size={18} />
          </span>
          <div>
            <p className="t-h3">{m.label}</p>
            <p className="t-meta-xs">{m.tagline}</p>
          </div>
        </div>
        <StatusPill tone="emerald" label="Installed" pulse />
      </header>

      <div className="relative mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
            Onboarding
          </p>
          <span className="t-meta">{done}/{total} steps</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200/60 dark:bg-zinc-800/60">
          <div
            className={cn('bar-progress h-full transition-all duration-500 ease-snap',
              fullySet ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-500 to-accent-500',
            )}
            style={{['--w' as string]: `${pct}%`} as React.CSSProperties}
          />
        </div>
        {!fullySet && (
          <ul className="mt-2 space-y-1.5">
            {m.onboarding.filter((s) => !s.done).slice(0, 2).map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-[12px] text-zinc-600 dark:text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="truncate">{s.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative mt-5 flex items-center justify-between border-t border-zinc-200/55 pt-3 dark:border-zinc-800/55">
        <span className="t-meta-xs">{m.category}</span>
        <div className="inline-flex items-center gap-1.5">
          <InlineAction
            tone="neutral"
            icon={<Settings2 size={11} />}
            onClick={() => onSelect(m)}
          >
            Manage
          </InlineAction>
          <Link
            href={m.href}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-brand-200/70 bg-brand-50/70 px-2 text-[11px] font-semibold text-brand-700 shadow-soft transition-soft hover:bg-brand-50 active:scale-[0.97] dark:border-brand-800/55 dark:bg-brand-900/25 dark:text-brand-300 dark:hover:bg-brand-900/40"
          >
            Open
            <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Catalog section (browse + category filter) ─────────────────────

function CatalogSection({
  category,
  onCategoryChange,
  modules,
  onSelect,
  pretendAction,
}: {
  category: CatalogModule['category'] | 'ALL';
  onCategoryChange: (c: CatalogModule['category'] | 'ALL') => void;
  modules: ReadonlyArray<CatalogModule>;
  onSelect: (m: CatalogModule) => void;
  pretendAction: (verb: string, target: string) => void;
}) {
  return (
    <section id="catalog">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow">Catalog</p>
          <h2 className="t-h3 mt-1">Browse the marketplace</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_FILTERS.map(({value, label}) => {
            const active = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onCategoryChange(value)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-soft',
                  active
                    ? 'border-brand-200/70 bg-brand-50/70 text-brand-700 dark:border-brand-800/55 dark:bg-brand-900/25 dark:text-brand-300'
                    : 'border-zinc-200/55 bg-white/55 text-zinc-600 hover:bg-white dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-400 dark:hover:bg-zinc-900',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="surface-translucent p-10 text-center text-xs text-zinc-500 dark:text-zinc-500">
          No modules match this category.
        </div>
      ) : (
        <div className="grid gap-3 stagger-children sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => (
            <CatalogCard
              key={m.id}
              module={m}
              onSelect={onSelect}
              pretendAction={pretendAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CatalogCard({
  module: m,
  onSelect,
  pretendAction,
}: {
  module: CatalogModule;
  onSelect: (m: CatalogModule) => void;
  pretendAction: (verb: string, target: string) => void;
}) {
  const a = ACCENT[m.accent];
  const status = STATUS_META[m.status];
  const disabled = m.status === 'soon';

  return (
    <article
      onClick={() => onSelect(m)}
      className={cn(
        'animate-slide-up surface-translucent surface-hover-brand group relative flex cursor-pointer flex-col overflow-hidden p-5',
        disabled && 'pointer-events-auto opacity-90',
      )}
    >
      <div className={`pointer-events-none absolute -bottom-12 -right-10 h-32 w-32 rounded-full bg-gradient-to-tr ${a.halo} opacity-${disabled ? '40' : '70'} transition-opacity duration-300 group-hover:opacity-100`} />

      <header className="relative flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.iconBg} ${disabled ? 'opacity-80' : ''}`}>
          <m.icon size={17} />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <StatusPill tone={status.tone} label={status.label} pulse={status.pulse} />
          {m.installed && <StatusPill tone="indigo" label="Installed" />}
        </div>
      </header>

      <div className="relative mt-4 flex-1">
        <p className="t-meta-xs">{m.tagline}</p>
        <p className="t-h3 mt-0.5">{m.label}</p>
        <p className="t-small mt-1 line-clamp-2">{m.description}</p>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-1">
        {m.tiers.map((t) => (
          <span
            key={t}
            className="rounded-md border border-zinc-200/55 bg-white/55 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600 dark:border-zinc-800/55 dark:bg-zinc-900/45 dark:text-zinc-400"
          >
            {t}
          </span>
        ))}
        <span className="ml-auto t-meta-xs">{m.pricing}</span>
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-zinc-200/55 pt-3 dark:border-zinc-800/55">
        <span className="t-meta-xs">{m.category}</span>
        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {m.installed ? (
            <InlineAction
              tone="neutral"
              icon={<Settings2 size={11} />}
              onClick={() => onSelect(m)}
            >
              Manage
            </InlineAction>
          ) : disabled ? (
            <InlineAction
              tone="neutral"
              icon={<Lock size={11} />}
              disabled
            >
              Roadmap
            </InlineAction>
          ) : (
            <InlineAction
              tone="primary"
              icon={<Power size={11} />}
              onClick={() => pretendAction('Install', m.label)}
            >
              Install
            </InlineAction>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Plan comparison strip ──────────────────────────────────────────

function PlanComparison() {
  const plans: ReadonlyArray<Tier> = ['FREE', 'LIGHT', 'PRO', 'PREMIUM'];

  return (
    <section className="surface-translucent relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      <div className="flex items-end justify-between gap-4 px-6 pb-3 pt-5">
        <div>
          <p className="section-eyebrow">Plans</p>
          <h2 className="t-h3 mt-1">Plan compatibility</h2>
          <p className="t-small mt-1 max-w-lg">
            Each module is available on one or more plan tiers. Upgrade unlocks modules
            instantly; downgrading parks installed modules until the plan permits.
          </p>
        </div>
        <Link href="/pricing" className="text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400">
          View plans →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
              <th className="px-6 py-2 font-semibold">Module</th>
              {plans.map((p) => (
                <th key={p} className="px-3 py-2 text-center font-semibold">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/55 dark:divide-zinc-800/55">
            {CATALOG.filter((m) => m.status !== 'soon').map((m) => {
              const a = ACCENT[m.accent];
              return (
                <tr key={m.id} className="transition-soft hover:bg-white/40 dark:hover:bg-zinc-900/40">
                  <td className="px-6 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${a.iconBg}`}>
                        <m.icon size={13} />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{m.label}</p>
                        <p className="t-meta-xs">{m.category}</p>
                      </div>
                    </div>
                  </td>
                  {plans.map((p) => {
                    const included = m.tiers.includes(p);
                    return (
                      <td key={p} className="px-3 py-3 text-center align-middle">
                        {included ? (
                          <CheckCircle2 size={14} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className="t-meta-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-zinc-200/55 px-6 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/55 dark:text-zinc-500">
        Pricing API ships when the billing summary client lands. Plan compatibility is
        controlled by the platform module catalog.
      </p>
    </section>
  );
}

// ─── Roadmap rail ────────────────────────────────────────────────────

function RoadmapRail({modules, onSelect}: {modules: ReadonlyArray<CatalogModule>; onSelect: (m: CatalogModule) => void}) {
  return (
    <section>
      <RailHeader eyebrow="Roadmap" title="Coming soon" />
      <div className="surface-translucent relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <ul className="grid gap-3 stagger-children sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const a = ACCENT[m.accent];
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m)}
                  className="flex w-full items-start gap-3 rounded-xl border border-dashed border-zinc-200/55 bg-white/40 p-3 text-left transition-soft hover:bg-white/60 dark:border-zinc-800/55 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/55"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.iconBg} opacity-70`}>
                    <m.icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="t-h3 leading-tight">{m.label}</p>
                    <p className="t-meta-xs line-clamp-2">{m.tagline}</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                      <Lock size={9} />
                      On roadmap
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ─── Detail Sheet ────────────────────────────────────────────────────

function ModuleSheet({
  module: m,
  onClose,
  pending,
  pretendAction,
}: {
  module: CatalogModule | null;
  onClose: () => void;
  pending: boolean;
  pretendAction: (verb: string, target: string) => void;
}) {
  const open = m !== null;
  if (!m) {
    return <Sheet open={open} onClose={onClose} title="Module detail" width="lg">{null}</Sheet>;
  }

  const a = ACCENT[m.accent];
  const status = STATUS_META[m.status];
  const total = m.onboarding.length;
  const done = m.onboarding.filter((s) => s.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const disabled = m.status === 'soon';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={m.label}
      description={`${m.tagline} · ${m.category}`}
      width="lg"
      dismissable={!pending}
    >
      <SheetBody>
        <div className="flex items-start gap-4 pb-4">
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${a.iconBg} ring-2 ${a.ring}`}>
            <m.icon size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill tone={status.tone} label={status.label} pulse={status.pulse} size="md" />
              {m.installed && <StatusPill tone="indigo" label="Installed" size="md" />}
              <StatusPill tone="zinc" label={m.pricing} size="md" />
            </div>
            <p className="t-body mt-2">{m.description}</p>
          </div>
        </div>

        {m.features.length > 0 && (
          <SheetSection eyebrow="Features" title="What you get">
            <ul className="grid grid-cols-2 gap-2">
              {m.features.map((f) => (
                <li key={f} className="flex items-center gap-2 rounded-md border border-zinc-200/55 bg-white/55 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-800/55 dark:bg-zinc-900/45 dark:text-zinc-300">
                  <Check size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>
          </SheetSection>
        )}

        <SheetSection eyebrow="Plan tiers" title="Available on">
          <div className="flex flex-wrap gap-2">
            {(['FREE', 'LIGHT', 'PRO', 'PREMIUM'] as const).map((tier) => {
              const included = m.tiers.includes(tier);
              const meta = TIER_META[tier];
              return (
                <span
                  key={tier}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-medium',
                    included
                      ? `border-${meta.tone}-200/70 bg-${meta.tone}-50/70 text-${meta.tone}-700 dark:border-${meta.tone}-800/55 dark:bg-${meta.tone}-900/25 dark:text-${meta.tone}-300`
                      : 'border-zinc-200/55 bg-zinc-50/40 text-zinc-400 dark:border-zinc-800/55 dark:bg-zinc-900/30 dark:text-zinc-600',
                  )}
                >
                  {included && <CheckCircle2 size={10} />}
                  {meta.label}
                </span>
              );
            })}
          </div>
        </SheetSection>

        {m.installed && m.onboarding.length > 0 && (
          <SheetSection eyebrow="Onboarding" title={`Setup · ${done}/${total} complete`}>
            <div className="space-y-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200/60 dark:bg-zinc-800/60">
                <div
                  className={cn('bar-progress h-full transition-all duration-500 ease-snap',
                    pct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-500 to-accent-500',
                  )}
                  style={{['--w' as string]: `${pct}%`} as React.CSSProperties}
                />
              </div>
              <div className="divide-y divide-zinc-200/55 dark:divide-zinc-800/55">
                {m.onboarding.map((step) => (
                  <div key={step.label} className="flex items-center gap-3 py-2.5">
                    <span className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      step.done
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'border-zinc-300/55 bg-white/55 text-zinc-400 dark:border-zinc-700/55 dark:bg-zinc-900/40 dark:text-zinc-600',
                    )}>
                      {step.done ? <Check size={11} /> : <span className="block h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />}
                    </span>
                    <span className={cn(
                      'flex-1 text-[12px]',
                      step.done ? 'text-zinc-500 line-through dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200',
                    )}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SheetSection>
        )}

        <SheetSection eyebrow="Activation" title="What happens when you install">
          <p className="t-small">
            Installing this module enables it for your tenant and grants the operator
            roles the permissions it needs. The audit ledger records the activation
            under <span className="font-mono">modules.enabled</span>. Uninstall is
            reversible — your data stays even after the module is parked.
          </p>
        </SheetSection>
      </SheetBody>

      <SheetFooter>
        <Link href={m.href} className="btn-ghost h-9 px-3 text-xs">
          Open module
          <ArrowUpRight size={12} />
        </Link>
        <span className="flex-1" />
        {disabled ? (
          <InlineAction tone="neutral" size="md" icon={<Lock size={12} />} disabled>
            On roadmap
          </InlineAction>
        ) : m.installed ? (
          <InlineAction
            tone="danger"
            size="md"
            pending={pending}
            icon={<PowerOff size={12} />}
            onClick={() => pretendAction('Uninstall', m.label)}
          >
            Uninstall
          </InlineAction>
        ) : (
          <InlineAction
            tone="primary"
            size="md"
            pending={pending}
            icon={<Power size={12} />}
            onClick={() => pretendAction('Install', m.label)}
          >
            Install module
          </InlineAction>
        )}
      </SheetFooter>
    </Sheet>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function RailHeader({eyebrow, title}: {eyebrow: string; title: string}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="t-h3 mt-1">{title}</h2>
      </div>
    </div>
  );
}

// Reserved for future highlight badge — keep tree-shake happy.
void Sparkles;
void Boxes;
