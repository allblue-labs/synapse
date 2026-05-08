import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart2,
  Boxes,
  Layers,
  Lock,
  MessageSquare,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Modules — Synapse',
  description: 'The Synapse module store — Pulse, Agents, Automation and more. Read-only public preview.',
};

interface ModuleCard {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  features: ReadonlyArray<string>;
  status: 'live' | 'beta' | 'soon';
  tier: 'FREE' | 'LIGHT' | 'PRO' | 'PREMIUM';
}

const MODULES: ReadonlyArray<ModuleCard> = [
  {
    slug: 'pulse',
    name: 'Pulse',
    eyebrow: 'Operational comms & workflow',
    description:
      'Inbox, tickets, timeline, playbooks, knowledge, catalog, integrations, metrics. The operational engine of Synapse.',
    features: ['Inbox', 'Tickets', 'Timeline', 'Playbooks', 'Knowledge'],
    status: 'live',
    tier: 'LIGHT',
  },
  {
    slug: 'agents',
    name: 'Agents',
    eyebrow: 'AI orchestration',
    description:
      'Define agents with tools, knowledge and guardrails. Deploy across channels and monitor every step.',
    features: ['Custom prompts', 'Tool calling', 'Knowledge base'],
    status: 'live',
    tier: 'PRO',
  },
  {
    slug: 'automation',
    name: 'Automation',
    eyebrow: 'Event-driven flows',
    description:
      'Build event-driven workflows that execute across modules. Triggers, conditions, and human-in-the-loop approvals.',
    features: ['Triggers', 'Workflows', 'Webhooks'],
    status: 'beta',
    tier: 'PRO',
  },
  {
    slug: 'analytics',
    name: 'Analytics',
    eyebrow: 'Outcomes & insights',
    description:
      'Track conversation outcomes, agent performance and conversions. Export to your warehouse.',
    features: ['Real-time metrics', 'Funnels', 'BQ / Snowflake'],
    status: 'soon',
    tier: 'PREMIUM',
  },
  {
    slug: 'integrations',
    name: 'Integrations',
    eyebrow: 'Connected systems',
    description:
      'Connect your CRM, calendar, billing and data warehouse. Two-way sync with audit trails.',
    features: ['CRM sync', 'Calendars', 'Webhooks'],
    status: 'soon',
    tier: 'PRO',
  },
  {
    slug: 'spark',
    name: 'Spark',
    eyebrow: 'Real-time triggers',
    description:
      'Reactive triggers from external systems. Forward events into Pulse skills or workflows in real time.',
    features: ['Event bus', 'Replay', 'Schema registry'],
    status: 'soon',
    tier: 'PREMIUM',
  },
];

const ICON_BY_SLUG: Record<string, typeof MessageSquare> = {
  pulse:        MessageSquare,
  agents:       Sparkles,
  automation:   Workflow,
  analytics:    BarChart2,
  integrations: Layers,
  spark:        Zap,
};

const ICON_BG_BY_SLUG: Record<string, string> = {
  pulse:        'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  agents:       'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  automation:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  analytics:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  integrations: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  spark:        'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

function StatusBadge({status}: {status: ModuleCard['status']}) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Live
      </span>
    );
  }
  if (status === 'beta') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-400">
        Beta
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/60 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500">
      <Lock size={9} />
      Coming soon
    </span>
  );
}

const TIER_LABEL: Record<ModuleCard['tier'], string> = {
  FREE: 'Free',
  LIGHT: 'Light',
  PRO: 'Pro',
  PREMIUM: 'Premium',
};

export default function PublicModulesPage() {
  return (
    <div className="space-y-12">
      <header className="mx-auto max-w-2xl text-center">
        <p className="section-eyebrow">Module Store</p>
        <h1 className="mt-3 h-display-sm">
          Composable modules.<br />
          <span className="text-gradient-subtle">Pick what you need.</span>
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          A read-only preview of the Synapse module catalog. Sign in to install, configure, and run each one inside your workspace.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map(({slug, name, eyebrow, description, features, status, tier}) => {
          const Icon = ICON_BY_SLUG[slug] ?? Boxes;
          const iconBg = ICON_BG_BY_SLUG[slug] ?? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400';
          return (
            <article
              key={slug}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800/60"
            >
              <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-0 transition-opacity group-hover:opacity-60" />

              <div className="relative flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon size={20} />
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="relative mt-5 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  {eyebrow}
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {name}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
              </div>

              <div className="relative mt-5 flex flex-wrap gap-1.5">
                {features.map((f) => (
                  <span
                    key={f}
                    className="rounded-md border border-zinc-200/80 bg-zinc-50/80 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300"
                  >
                    {f}
                  </span>
                ))}
              </div>

              <div className="relative mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
                  Tier · {TIER_LABEL[tier]}
                </span>
                <ArrowUpRight size={14} className="text-zinc-400" />
              </div>
            </article>
          );
        })}
      </section>

      <section className="mx-auto max-w-2xl text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Want to install a module?
        </p>
        <Link
          href="/login?next=/workspace/modules"
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-zinc-800 hover:shadow-card dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          Sign in to install
          <ArrowUpRight size={14} />
        </Link>
      </section>
    </div>
  );
}
