import Link from 'next/link';
import {
  CalendarClock,
  ListChecks,
  AlertTriangle,
  Settings2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'ClinicFlow AI'};

const SUB_FEATURES = [
  {
    key: 'queue',
    label: 'Queue',
    description: 'Review incoming WhatsApp scheduling requests. Validate AI-extracted data and approve confirmed appointments.',
    href: '/modules/messaging/clinic-flow/queue',
    icon: ListChecks,
    color: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
  },
  {
    key: 'errors',
    label: 'Errors',
    description: 'Inspect messages that failed processing. Retry, reassign or dismiss.',
    href: '/modules/messaging/clinic-flow/errors',
    icon: AlertTriangle,
    color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Configure AI extraction rules, confidence thresholds and calendar integration.',
    href: '/modules/messaging/clinic-flow/settings',
    icon: Settings2,
    color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
] as const;

export default function ClinicFlowPage() {
  return (
    <div className="animate-fade-in">
      <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
        <Link href="/modules" className="hover:text-zinc-600 dark:hover:text-zinc-300">
          Modules
        </Link>
        <ChevronRight size={12} />
        <Link
          href="/modules/messaging"
          className="hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Messaging
        </Link>
        <ChevronRight size={12} />
        <span className="text-zinc-600 dark:text-zinc-300">ClinicFlow AI</span>
      </nav>

      <div className="mb-10 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CalendarClock size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            ClinicFlow AI
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Automate WhatsApp scheduling with AI transcription, extraction and human validation.
          </p>
        </div>
      </div>

      <div className="mb-10 rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
          How it works
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          {[
            'WhatsApp message',
            '→',
            'Audio transcription',
            '→',
            'AI extraction',
            '→',
            'Human validation',
            '→',
            'Calendar booking',
          ].map((step, i) => (
            <span
              key={i}
              className={
                step === '→'
                  ? 'text-zinc-300 dark:text-zinc-600'
                  : 'rounded-md bg-white px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700'
              }
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {SUB_FEATURES.map(({key, label, description, href, icon: Icon, color}) => (
          <Link
            key={key}
            href={href}
            className="group rounded-xl border border-zinc-200 bg-white/60 p-6 transition hover:border-brand-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-brand-700"
          >
            <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
              <Icon size={20} />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{label}</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
            <div className="mt-5 flex items-center gap-1 text-xs font-medium text-brand-600 opacity-0 transition group-hover:opacity-100 dark:text-brand-400">
              Open <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
