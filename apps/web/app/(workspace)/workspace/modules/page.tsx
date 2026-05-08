import Link from 'next/link';
import {
  MessageSquare,
  Zap,
  Bot,
  BarChart2,
  ArrowUpRight,
  Layers,
  Lock,
  Workflow,
} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Modules'};

type Status = 'active' | 'beta' | 'soon';

interface ModuleCard {
  id: string;
  label: string;
  eyebrow: string;
  description: string;
  href: string;
  icon: React.ComponentType<{size?: number}>;
  status: Status;
  features: readonly string[];
  iconBg: string;
}

const ALL_MODULES: readonly ModuleCard[] = [
  {
    id: 'pulse',
    label: 'Pulse',
    eyebrow: 'Operational comms & workflows',
    description:
      'Inbox, tickets, timeline and playbooks. AI extraction routes inbound items through skills; humans review only where it matters.',
    href: '/workspace/modules/pulse',
    icon: MessageSquare,
    status: 'active',
    features: ['Inbox', 'Tickets', 'Timeline', 'Playbooks'],
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'agents',
    label: 'Agents',
    eyebrow: 'AI orchestration',
    description:
      'Define agents with tools, knowledge and guardrails. Deploy across channels and monitor every step.',
    href: '/agents',
    icon: Bot,
    status: 'active',
    features: ['Custom prompts', 'Knowledge base', 'Tool calling'],
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'automation',
    label: 'Automation',
    eyebrow: 'Event-driven flows',
    description:
      'Build workflows that execute across modules. Triggers, conditions, and human-in-the-loop approvals.',
    href: '#',
    icon: Workflow,
    status: 'beta',
    features: ['Triggers', 'Workflows', 'Webhooks'],
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    eyebrow: 'Outcomes & insights',
    description:
      'Track conversation outcomes, agent performance, and conversions. Export to your warehouse.',
    href: '#',
    icon: BarChart2,
    status: 'soon',
    features: ['Real-time metrics', 'Funnels', 'BQ / Snowflake'],
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    eyebrow: 'Connected systems',
    description:
      'Connect your CRM, calendar, billing, and data warehouse. Two-way sync with audit trails.',
    href: '#',
    icon: Layers,
    status: 'soon',
    features: ['CRM sync', 'Calendars', 'Webhooks'],
    iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'spark',
    label: 'Spark',
    eyebrow: 'Real-time triggers',
    description:
      'Reactive triggers from external systems. Forward events into agents or workflows in real time.',
    href: '#',
    icon: Zap,
    status: 'soon',
    features: ['Event bus', 'Replay', 'Schema registry'],
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
];

function StatusPill({status}: {status: Status}) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  if (status === 'beta') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-400">
        Beta
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/60 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500">
      <Lock size={9} />
      Coming soon
    </span>
  );
}

export default function ModulesPage() {
  const active = ALL_MODULES.filter((m) => m.status === 'active' || m.status === 'beta');
  const soon = ALL_MODULES.filter((m) => m.status === 'soon');

  return (
    <div className="animate-fade-in space-y-12">

      <PageHeader
        eyebrow="Platform"
        title="Modules"
        description="Browse and access platform modules. Each ships with sensible defaults and is available to your tenant once activated."
        icon={<Layers size={26} />}
        iconGradient="from-brand-500 to-accent-500"
        glowColor="bg-brand-500/15"
      />

      {/* ── Active / Beta ───────────────────────────── */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="section-eyebrow">Available now</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Active modules
            </h2>
          </div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
            {active.length} {active.length === 1 ? 'module' : 'modules'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map(({id, label, eyebrow, description, href, icon: Icon, status, features, iconBg}) => (
            <Link
              key={id}
              href={href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800/60"
            >
              {/* Soft mesh on hover */}
              <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-0 transition-opacity group-hover:opacity-60" />

              <div className="relative flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon size={20} />
                </div>
                <StatusPill status={status} />
              </div>

              <div className="relative mt-5 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  {eyebrow}
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {label}
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
                  Open module
                </span>
                <ArrowUpRight
                  size={14}
                  className="text-zinc-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600 dark:group-hover:text-brand-400"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Coming soon ─────────────────────────────── */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="section-eyebrow">On the roadmap</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Coming soon
            </h2>
          </div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
            {soon.length} {soon.length === 1 ? 'module' : 'modules'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {soon.map(({id, label, eyebrow, description, icon: Icon, status, features, iconBg}) => (
            <div
              key={id}
              className="relative flex flex-col overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-white/40 p-6 dark:border-zinc-800/70 dark:bg-zinc-900/40"
            >
              <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />

              <div className="relative flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl opacity-50 ${iconBg}`}>
                  <Icon size={20} />
                </div>
                <StatusPill status={status} />
              </div>

              <div className="relative mt-5 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                  {eyebrow}
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-tight text-zinc-500 dark:text-zinc-500">
                  {label}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
                  {description}
                </p>
              </div>

              <div className="relative mt-5 flex flex-wrap gap-1.5">
                {features.map((f) => (
                  <span
                    key={f}
                    className="rounded-md border border-zinc-200/60 bg-white/40 px-2 py-0.5 text-[11px] font-medium text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-600"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
