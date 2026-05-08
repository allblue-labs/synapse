import Link from 'next/link';
import {
  MessageSquare,
  Zap,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Bot,
  BarChart2,
  TrendingUp,
  Layers,
  Workflow,
  Sparkles,
} from 'lucide-react';
import {Can} from '@/components/auth/can';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Overview'};

const STATS = [
  {label: 'Active modules',  value: '2',  delta: null,        icon: Layers},
  {label: 'Agents deployed', value: '0',  delta: null,        icon: Bot},
  {label: 'Messages today',  value: '—',  delta: null,        icon: MessageSquare},
  {label: 'Automations',     value: '—',  delta: null,        icon: Workflow},
] as const;

const MODULES = [
  {
    id: 'messaging',
    label: 'Pulse',
    description: 'Operational comms + workflow engine. Routes inbound items through AI, applies skills, hands off to humans where it matters.',
    href: '/workspace/modules/pulse',
    icon: MessageSquare,
    active: true,
    features: ['Inbox', 'Tickets', 'Timeline'],
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'agents',
    label: 'Agents',
    description: 'Define, deploy and monitor custom AI agents with domain knowledge.',
    href: '/workspace/agents',
    icon: Bot,
    active: true,
    features: ['Custom agents', 'Knowledge base', 'Tool use'],
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'automation',
    label: 'Automation',
    description: 'Build event-driven workflows that execute across modules.',
    href: '#',
    icon: Zap,
    active: false,
    features: ['Triggers', 'Workflows', 'Conditions'],
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Track conversation outcomes, agent metrics and export.',
    href: '#',
    icon: BarChart2,
    active: false,
    features: ['Logs', 'Performance', 'Exports'],
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
] as const;

const QUICK_ACTIONS = [
  {label: 'Open Pulse module', sub: 'Inbox & channels',     href: '/workspace/modules/pulse', icon: MessageSquare},
  {label: 'Create an agent',       sub: 'Custom AI behaviors',  href: '/workspace/agents',            icon: Bot},
  {label: 'View activity log',     sub: 'Real-time events',     href: '/workspace/activity',          icon: TrendingUp},
] as const;

export default function OverviewPage() {
  return (
    <div className="animate-fade-in space-y-10">

      {/* ── Page header with gradient banner ────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">

        {/* Decorative mesh background */}
        <div className="pointer-events-none absolute inset-0 bg-hero-mesh opacity-60" />
        <div className="pointer-events-none absolute -right-12 -top-16 h-[280px] w-[280px] rounded-full bg-brand-500/15 blur-3xl" />

        <div className="relative flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <div className="pill-brand">
              <Sparkles size={11} />
              Welcome back
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[1.75rem]">
              Your platform at a glance.
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              All modules, agents, and activity in one view. Jump in where you left off.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/workspace/modules" className="btn-secondary h-10 px-4">
              <Layers size={14} />
              Modules
            </Link>
            <Can permission="agents:write">
              <Link href="/workspace/agents" className="btn-primary h-10 px-4">
                <Plus size={14} />
                New agent
              </Link>
            </Can>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map(({label, value, icon: Icon}) => (
            <div
              key={label}
              className="group relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-card dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <Icon size={15} />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                {value}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Module grid ─────────────────────────────── */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="section-eyebrow">Platform</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Modules
            </h2>
          </div>
          <Link
            href="/workspace/modules"
            className="flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            View all <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MODULES.map(({id, label, description, href, icon: Icon, active, features, iconBg}) =>
            active ? (
              <Link
                key={id}
                href={href}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800/50"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {features.map((f) => (
                    <span key={f} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {f}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-400">
                  Open module <ArrowUpRight size={12} />
                </div>
              </Link>
            ) : (
              <div
                key={id}
                className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/60 p-6 dark:border-zinc-800/50 dark:bg-zinc-900/40"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl opacity-50 ${iconBg}`}>
                    <Icon size={20} />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                    Coming soon
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-zinc-400 dark:text-zinc-500">
                  {label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400 dark:text-zinc-600">
                  {description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {features.map((f) => (
                    <span key={f} className="rounded-md bg-zinc-100/60 px-2 py-0.5 text-[11px] font-medium text-zinc-400 dark:bg-zinc-800/40 dark:text-zinc-600">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* ── Quick actions ───────────────────────────── */}
      <section>
        <div className="mb-5">
          <p className="section-eyebrow">Shortcuts</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Quick actions
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map(({label, sub, href, icon: Icon}) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-brand-900/30 dark:group-hover:text-brand-400">
                <Icon size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
              </div>
              <ArrowUpRight size={14} className="text-zinc-400 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400" />
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
