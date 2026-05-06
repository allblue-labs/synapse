import Link from 'next/link';
import {
  CalendarClock,
  ListChecks,
  AlertTriangle,
  Settings2,
  ArrowUpRight,
  MessageSquare,
  Mic,
  Sparkles,
  UserCheck,
  CalendarCheck,
} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'ClinicFlow AI'};

const SUB_FEATURES = [
  {
    key: 'queue',
    label: 'Queue',
    description:
      'Review incoming WhatsApp scheduling requests. Validate AI-extracted data and approve confirmed appointments.',
    href: '/modules/messaging/clinic-flow/queue',
    icon: ListChecks,
    iconBg: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
    count: '— pending',
  },
  {
    key: 'errors',
    label: 'Errors',
    description:
      'Inspect messages that failed processing. Retry, reassign or dismiss with full audit trails.',
    href: '/modules/messaging/clinic-flow/errors',
    icon: AlertTriangle,
    iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
    count: '— errors',
  },
  {
    key: 'settings',
    label: 'Settings',
    description:
      'Configure AI extraction rules, confidence thresholds and calendar integration endpoints.',
    href: '/modules/messaging/clinic-flow/settings',
    icon: Settings2,
    iconBg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    count: 'Configure',
  },
] as const;

const PIPELINE = [
  {label: 'WhatsApp message',  icon: MessageSquare},
  {label: 'Audio transcript',  icon: Mic},
  {label: 'AI extraction',     icon: Sparkles},
  {label: 'Human validation',  icon: UserCheck},
  {label: 'Calendar booking',  icon: CalendarCheck},
] as const;

export default function ClinicFlowPage() {
  return (
    <div className="animate-fade-in space-y-10">

      <PageHeader
        eyebrow="Sub-module · Messaging"
        title="ClinicFlow AI"
        description="Automate WhatsApp scheduling end-to-end. Audio messages are transcribed, appointment fields extracted, and approved by your team before booking."
        icon={<CalendarClock size={26} />}
        iconGradient="from-emerald-500 to-teal-500"
        glowColor="bg-emerald-500/15"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        }
      />

      {/* ── Pipeline visualization ────────────────────── */}
      <section>
        <div className="mb-5">
          <p className="section-eyebrow">Pipeline</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            How it works
          </h2>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-50" />

          {/* Desktop: horizontal pipeline with connecting line */}
          <div className="relative hidden lg:block">
            {/* Connecting line behind nodes */}
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

          {/* Mobile: vertical pipeline */}
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

      {/* ── Sub-features ──────────────────────────────── */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="section-eyebrow">Manage</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Workspaces
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {SUB_FEATURES.map(({key, label, description, href, icon: Icon, iconBg, count}) => (
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
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
                  {count}
                </span>
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
