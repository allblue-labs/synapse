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
  Layers,
  Lock,
  MessageSquare,
  Plug,
  Sparkles,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Module store'};

/**
 * Client module store.
 *
 *   - Operational marketplace, not a CRUD list.
 *   - Hero strip with discovery cues, then a featured "Active" Pulse
 *     module (large), a "Recommended" rail of next picks, then the
 *     full catalog grouped by category.
 *   - Plan compatibility + state are surfaced honestly. No fake pricing —
 *     "Included" / "Add-on" / "On roadmap" until the catalog API ships.
 */

type Status = 'active' | 'beta' | 'soon';

interface CatalogModule {
  id: string;
  label: string;
  tagline: string;
  description: string;
  href: string;
  icon: LucideIcon;
  category: 'Operations' | 'AI' | 'Automation' | 'Data' | 'Connectivity';
  status: Status;
  pricing: 'Included' | 'Add-on' | 'On roadmap';
  highlight?: boolean;
  features: ReadonlyArray<string>;
  accent: 'brand' | 'indigo' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose' | 'cyan';
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
    id: 'pulse', label: 'Pulse', tagline: 'Operational comms & workflow',
    description: 'Inbox, tickets, timeline and playbooks. AI extraction routes inbound items through skills; humans review only where it matters.',
    href: '/workspace/modules/pulse',
    icon: MessageSquare, category: 'Operations', status: 'active', pricing: 'Included',
    highlight: true,
    features: ['Operator queue', 'Confidence routing', 'Operator review', 'Audit timeline'],
    accent: 'brand',
  },
  {
    id: 'agents', label: 'Agents', tagline: 'AI orchestration',
    description: 'Define agents with tools, knowledge and guardrails. Deploy across channels and monitor every step.',
    href: '/workspace/agents',
    icon: Bot, category: 'AI', status: 'active', pricing: 'Included',
    features: ['Custom prompts', 'Knowledge base', 'Tool calling'],
    accent: 'violet',
  },
  {
    id: 'automation', label: 'Automation', tagline: 'Event-driven flows',
    description: 'Build workflows that execute across modules. Triggers, conditions, and human-in-the-loop approvals.',
    href: '#',
    icon: Workflow, category: 'Automation', status: 'beta', pricing: 'Add-on',
    features: ['Triggers', 'Conditions', 'Webhooks'],
    accent: 'amber',
  },
  {
    id: 'analytics', label: 'Analytics', tagline: 'Outcomes & insights',
    description: 'Track conversation outcomes, agent performance, and conversions. Export to your warehouse.',
    href: '#',
    icon: BarChart2, category: 'Data', status: 'soon', pricing: 'Add-on',
    features: ['Real-time metrics', 'Funnels', 'BQ / Snowflake'],
    accent: 'emerald',
  },
  {
    id: 'integrations', label: 'Integrations', tagline: 'Connected systems',
    description: 'Connect your CRM, calendar, billing, and data warehouse. Two-way sync with audit trails.',
    href: '#',
    icon: Plug, category: 'Connectivity', status: 'soon', pricing: 'Included',
    features: ['CRM sync', 'Calendars', 'Webhooks'],
    accent: 'cyan',
  },
  {
    id: 'spark', label: 'Spark', tagline: 'Real-time triggers',
    description: 'Reactive triggers from external systems. Forward events into agents or workflows in real time.',
    href: '#',
    icon: Zap, category: 'Automation', status: 'soon', pricing: 'On roadmap',
    features: ['Event bus', 'Replay', 'Schema registry'],
    accent: 'rose',
  },
];

const CATEGORIES: ReadonlyArray<CatalogModule['category']> = ['Operations', 'AI', 'Automation', 'Data', 'Connectivity'];

export default function ModulesStorePage() {
  const active     = CATALOG.filter((m) => m.status === 'active');
  const beta       = CATALOG.filter((m) => m.status === 'beta');
  const soon       = CATALOG.filter((m) => m.status === 'soon');
  const featured   = active.find((m) => m.highlight) ?? active[0];
  const recommend  = [...active.filter((m) => m.id !== featured?.id), ...beta].slice(0, 3);

  return (
    <div className="space-y-12">
      <Hero activeCount={active.length} totalCount={CATALOG.length} />

      {/* ── Featured (left, large) + Recommended (right rail) ── */}
      {featured && (
        <section>
          <RailHeader eyebrow="Active" title="Already running in your workspace" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <FeaturedCard module={featured} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {recommend.map((m) => <CompactCard key={m.id} module={m} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Catalog by category ── */}
      <section>
        <RailHeader eyebrow="Catalog" title="Browse the marketplace" />
        <div className="space-y-8">
          {CATEGORIES.map((category) => {
            const items = CATALOG.filter((m) => m.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category}>
                <div className="mb-3 flex items-center gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">{category}</p>
                  <div className="h-px flex-1 bg-gradient-to-r from-zinc-200 to-transparent dark:from-zinc-800" />
                  <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-600">{items.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((m) => <CatalogCard key={m.id} module={m} />)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Roadmap rail ── */}
      {soon.length > 0 && (
        <section>
          <RailHeader eyebrow="Roadmap" title="Coming soon" />
          <div className="surface-translucent relative overflow-hidden p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {soon.map((m) => {
                const a = ACCENT[m.accent];
                return (
                  <li key={m.id} className="flex items-start gap-3 rounded-xl border border-dashed border-zinc-200/80 bg-white/40 p-3 dark:border-zinc-800/70 dark:bg-zinc-900/30">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.iconBg} opacity-70`}>
                      <m.icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-300">{m.label}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">{m.tagline}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        <Lock size={9} />
                        On roadmap
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero({activeCount, totalCount}: {activeCount: number; totalCount: number}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-soft dark:border-zinc-800/70 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25">
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
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-zinc-50 sm:text-[2.25rem]">
            Discover, install, upgrade.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Each module ships with sensible defaults and unlocks once activated for your tenant. Browse what&apos;s live, see what&apos;s coming, and grow your workspace as your operation grows.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href="/workspace/modules/pulse" className="btn-primary h-10 px-4">
              <Sparkles size={14} />
              Open Pulse
            </Link>
            <Link href="/pricing" className="btn-secondary h-10 px-4">
              View plans
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <HeroStat label="Active"      value={activeCount}                tone="brand"   icon={Layers}  stripes />
          <HeroStat label="Catalog"     value={totalCount}                 tone="violet"  icon={Boxes} />
          <HeroStat label="Plan"        value="Pro"                        tone="emerald" icon={CheckCircle2} />
          <HeroStat label="Add-ons"     value="—"                          tone="amber"   icon={Plug} />
        </div>
      </div>
    </section>
  );
}

const HERO_TONE: Record<'brand' | 'violet' | 'emerald' | 'amber', {text: string; bg: string}> = {
  brand:   {text: 'text-brand-700 dark:text-brand-300',     bg: 'from-brand-500/15 to-brand-500/0'},
  violet:  {text: 'text-violet-700 dark:text-violet-300',   bg: 'from-violet-500/15 to-violet-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
};

function HeroStat({label, value, tone, icon: Icon, stripes}: {label: string; value: number | string; tone: keyof typeof HERO_TONE; icon: LucideIcon; stripes?: boolean}) {
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

// ─── Featured (large) ───────────────────────────────────────────────

function FeaturedCard({module: m}: {module: CatalogModule}) {
  const a = ACCENT[m.accent];
  return (
    <Link
      href={m.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/65 p-6 backdrop-blur-xl shadow-soft transition-all duration-200 ease-snap hover:-translate-y-[2px] hover:border-brand-200/80 hover:shadow-card dark:border-zinc-800/70 dark:bg-zinc-900/55 dark:hover:border-brand-800/60"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.halo} opacity-80`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${a.iconBg} ring-2 ${a.ring}`}>
            <m.icon size={20} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">{m.tagline}</p>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{m.label}</h3>
          </div>
        </div>
        <StatusPill status={m.status} pricing={m.pricing} />
      </div>

      <p className="relative mt-4 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {m.description}
      </p>

      <ul className="relative mt-5 grid grid-cols-2 gap-2">
        {m.features.map((f) => (
          <li key={f} className="flex items-center gap-2 rounded-md border border-zinc-200/60 bg-white/60 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-300">
            <Check size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            {f}
          </li>
        ))}
      </ul>

      <div className="relative mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800/60">
        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">Open module</span>
        <ArrowUpRight size={14} className="row-arrow" />
      </div>
    </Link>
  );
}

// ─── Compact (rail) ─────────────────────────────────────────────────

function CompactCard({module: m}: {module: CatalogModule}) {
  const a = ACCENT[m.accent];
  return (
    <Link
      href={m.href}
      className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/65 p-4 backdrop-blur-xl transition-all duration-200 ease-snap hover:-translate-y-[2px] hover:border-brand-200/80 hover:shadow-card dark:border-zinc-800/70 dark:bg-zinc-900/55 dark:hover:border-brand-800/60"
    >
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r ${a.halo} opacity-50 transition-opacity duration-300 group-hover:opacity-100`} />
      <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
        <m.icon size={15} />
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{m.label}</p>
          <StatusPill status={m.status} pricing={m.pricing} compact />
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">{m.tagline}</p>
      </div>
      <ArrowUpRight size={14} className="row-arrow shrink-0" />
    </Link>
  );
}

// ─── Catalog (medium) ───────────────────────────────────────────────

function CatalogCard({module: m}: {module: CatalogModule}) {
  const a = ACCENT[m.accent];
  const disabled = m.status === 'soon';
  return (
    <Link
      href={disabled ? '#' : m.href}
      aria-disabled={disabled}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border ${disabled ? 'border-zinc-200/60 bg-white/35 dark:border-zinc-800/60 dark:bg-zinc-900/30' : 'border-zinc-200/70 bg-white/65 dark:border-zinc-800/70 dark:bg-zinc-900/55'} p-5 backdrop-blur-xl transition-all duration-200 ease-snap ${disabled ? 'pointer-events-none' : 'hover:-translate-y-[2px] hover:border-brand-200/80 hover:shadow-card dark:hover:border-brand-800/60'}`}
    >
      <div className={`pointer-events-none absolute -bottom-12 -right-10 h-32 w-32 rounded-full bg-gradient-to-tr ${a.halo} opacity-${disabled ? '40' : '70'} transition-opacity duration-300 ${disabled ? '' : 'group-hover:opacity-100'}`} />

      <div className="relative flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.iconBg} ${disabled ? 'opacity-70' : ''}`}>
          <m.icon size={17} />
        </span>
        <StatusPill status={m.status} pricing={m.pricing} />
      </div>

      <div className="relative mt-4 flex-1">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${disabled ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-500'}`}>{m.tagline}</p>
        <h3 className={`mt-0.5 text-base font-semibold tracking-tight ${disabled ? 'text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>{m.label}</h3>
        <p className={`mt-1 line-clamp-2 text-[12px] leading-relaxed ${disabled ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-400'}`}>{m.description}</p>
      </div>

      <ul className="relative mt-4 flex flex-wrap gap-1.5">
        {m.features.slice(0, 3).map((f) => (
          <li key={f} className={`rounded-md border ${disabled ? 'border-zinc-200/60 bg-white/30 text-zinc-400 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-600' : 'border-zinc-200/60 bg-white/50 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-300'} px-2 py-0.5 text-[10px] font-medium`}>
            {f}
          </li>
        ))}
      </ul>

      <div className={`relative mt-4 flex items-center justify-between border-t pt-3 ${disabled ? 'border-zinc-100/70 dark:border-zinc-800/30' : 'border-zinc-100 dark:border-zinc-800/60'}`}>
        <span className={`text-[11px] font-medium ${disabled ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-500'}`}>
          {disabled ? 'Roadmap' : 'Open module'}
        </span>
        {!disabled && <ArrowUpRight size={12} className="row-arrow" />}
      </div>
    </Link>
  );
}

function StatusPill({status, pricing, compact}: {status: Status; pricing: CatalogModule['pricing']; compact?: boolean}) {
  if (status === 'active') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400 ${compact ? '' : 'sm:px-2.5'}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
        {compact ? 'Live' : `Live · ${pricing}`}
      </span>
    );
  }
  if (status === 'beta') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/80 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-400 ${compact ? '' : 'sm:px-2.5'}`}>
        Beta · {pricing}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500 ${compact ? '' : 'sm:px-2.5'}`}>
      <Lock size={9} />
      {compact ? 'Soon' : `Soon · ${pricing}`}
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
      <Link href="#catalog" className="hidden text-xs font-medium text-brand-600 hover:underline dark:text-brand-400 sm:inline">
        <span className="inline-flex items-center gap-1">All modules <ArrowRight size={11} /></span>
      </Link>
    </div>
  );
}
