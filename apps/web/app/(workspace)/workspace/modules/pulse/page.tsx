import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Boxes,
  Inbox,
  Megaphone,
  Plug,
  Settings2,
  Sparkles,
  Ticket,
  Workflow,
} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Pulse'};

/**
 * Pulse module overview — entry point for the operational workspace.
 * Surfaces the full sub-route IA from a single page so operators can
 * jump in to whatever lane they need.
 */

interface PulseSurface {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: typeof Inbox;
  iconBg: string;
  /** Stage this surface lands in. `live` ⇒ shipping today; otherwise the tracking tag. */
  state: 'live' | 'pending';
}

const SURFACES: ReadonlyArray<PulseSurface> = [
  {
    key: 'inbox',
    label: 'Inbox',
    description:
      'Operational queue: status, skill classification, confidence, escalations and pending reviews.',
    href: '/workspace/modules/pulse/inbox',
    icon: Inbox,
    iconBg: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
    state: 'live',
  },
  {
    key: 'tickets',
    label: 'Tickets',
    description:
      'Ticket lifecycle across types — support, sales, scheduling, marketing, operator review.',
    href: '/workspace/modules/pulse/tickets',
    icon: Ticket,
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    state: 'pending',
  },
  {
    key: 'timeline',
    label: 'Timeline',
    description:
      'Real-time feed of operational events: AI decisions, workflow transitions, human reviews.',
    href: '/workspace/modules/pulse/timeline',
    icon: Activity,
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    state: 'pending',
  },
  {
    key: 'playbooks',
    label: 'Playbooks',
    description:
      'Visual guided operational flows — define how AI agents and humans collaborate per skill.',
    href: '/workspace/modules/pulse/playbooks',
    icon: Workflow,
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    state: 'pending',
  },
  {
    key: 'knowledge',
    label: 'Knowledge',
    description:
      'FAQs, business descriptions, operational instructions, products and services.',
    href: '/workspace/modules/pulse/knowledge',
    icon: BookOpen,
    iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    state: 'pending',
  },
  {
    key: 'catalog',
    label: 'Catalog',
    description:
      'Products and services Pulse can quote, recommend and sell inside conversations.',
    href: '/workspace/modules/pulse/catalog',
    icon: Boxes,
    iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    state: 'pending',
  },
  {
    key: 'campaigns',
    label: 'Campaigns',
    description:
      'Outbound operational campaigns: promotions, scheduled outreach and marketing flows.',
    href: '/workspace/modules/pulse/campaigns',
    icon: Megaphone,
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    state: 'pending',
  },
  {
    key: 'integrations',
    label: 'Integrations',
    description:
      'Calendars, CRMs and scheduling providers Pulse plugs into to take real-world actions.',
    href: '/workspace/modules/pulse/integrations',
    icon: Plug,
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    state: 'pending',
  },
  {
    key: 'metrics',
    label: 'Metrics',
    description:
      'Conversation volume, resolution rate, escalations, response time and AI usage.',
    href: '/workspace/modules/pulse/metrics',
    icon: BarChart3,
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    state: 'pending',
  },
  {
    key: 'logs',
    label: 'Logs',
    description:
      'Inspect items that failed processing. Retry, reassign or dismiss with full audit trails.',
    href: '/workspace/modules/pulse/logs',
    icon: Activity,
    iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
    state: 'live',
  },
  {
    key: 'settings',
    label: 'Settings',
    description:
      'Confidence thresholds, channel & calendar wiring, escalation rules.',
    href: '/workspace/modules/pulse/settings',
    icon: Settings2,
    iconBg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    state: 'live',
  },
];

const PIPELINE = [
  {label: 'Inbound message',    icon: Inbox},
  {label: 'AI extraction',      icon: Sparkles},
  {label: 'Skill routing',      icon: Workflow},
  {label: 'Operator review',    icon: Ticket},
  {label: 'Operational action', icon: ArrowUpRight},
] as const;

export default function PulseOverviewPage() {
  return (
    <div className="animate-fade-in space-y-10">

      <PageHeader
        eyebrow="Module"
        title="Pulse"
        description="Operational communication and workflow engine. Pulse routes inbound items through AI extraction, applies the right skill, and hands off to humans only where it adds value."
        icon={<Sparkles size={26} />}
        iconGradient="from-brand-500 to-accent-500"
        glowColor="bg-brand-500/15"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        }
      />

      {/* ── Pipeline ────────────────────────────────── */}
      <section>
        <div className="mb-5">
          <p className="section-eyebrow">Pipeline</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            How Pulse processes work
          </h2>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-50" />

          <div className="relative hidden lg:block">
            <div className="absolute left-[8%] right-[8%] top-7 h-px bg-gradient-to-r from-brand-200 via-zinc-200 to-emerald-200 dark:from-brand-800 dark:via-zinc-700 dark:to-emerald-800" />
            <ol className="relative grid grid-cols-5 gap-3">
              {PIPELINE.map(({label, icon: Icon}, idx) => (
                <li key={label} className="flex flex-col items-center text-center">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-soft ring-4 ring-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:ring-zinc-900">
                    <Icon size={20} />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                      {idx + 1}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {label}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <ol className="relative space-y-3 lg:hidden">
            {PIPELINE.map(({label, icon: Icon}, idx) => (
              <li key={label} className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-soft dark:border-zinc-700 dark:bg-zinc-800">
                  <Icon size={16} />
                </div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  <span className="mr-2 text-zinc-400">{idx + 1}.</span>
                  {label}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Surface grid ────────────────────────────── */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="section-eyebrow">Workspaces</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Operational surfaces
            </h2>
          </div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
            {SURFACES.filter((s) => s.state === 'live').length} live · {SURFACES.filter((s) => s.state === 'pending').length} pending
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SURFACES.map(({key, label, description, href, icon: Icon, iconBg, state}) => (
            <Link
              key={key}
              href={href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800/60"
            >
              <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-0 transition-opacity group-hover:opacity-60" />

              <div className="relative flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon size={20} />
                </div>
                {state === 'live' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-400">
                    Stage 1B
                  </span>
                )}
              </div>

              <div className="relative mt-5 flex-1">
                <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {label}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
              </div>

              <div className="relative mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
                  Open
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
    </div>
  );
}
