import Link from 'next/link';
import {
  MessageSquare,
  CalendarClock,
  MessagesSquare,
  Radio,
  ArrowUpRight,
  Lock,
  Plug,
} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import {Can} from '@/components/auth/can';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Messaging'};

interface SubModule {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{size?: number}>;
  active: boolean;
  iconBg: string;
}

const SUB_MODULES: readonly SubModule[] = [
  {
    id: 'clinic-flow',
    label: 'ClinicFlow AI',
    description:
      'Automate WhatsApp scheduling with AI transcription, structured extraction and human-in-the-loop validation.',
    href: '/modules/messaging/clinic-flow',
    icon: CalendarClock,
    active: true,
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'conversations',
    label: 'Conversations',
    description:
      'Full conversation history with search, filters and human handoff. Unified across all connected channels.',
    href: '#',
    icon: MessagesSquare,
    active: false,
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'channels',
    label: 'Channels',
    description:
      'Connect and manage WhatsApp Business, Telegram and Discord channels. OAuth and QR-code flows.',
    href: '#',
    icon: Radio,
    active: false,
    iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
];

export default function MessagingPage() {
  return (
    <div className="animate-fade-in space-y-10">

      <PageHeader
        eyebrow="Module"
        title="Messaging"
        description="Connect messaging channels and automate conversations with AI agents. Configure sub-modules, add channels and review activity."
        icon={<MessageSquare size={26} />}
        iconGradient="from-blue-500 to-cyan-500"
        glowColor="bg-blue-500/15"
        actions={
          <Can permission="channels:connect">
            <button type="button" className="btn-secondary h-9 px-3.5 text-xs">
              <Plug size={13} />
              Add channel
            </button>
          </Can>
        }
      />

      {/* ── Sub-modules grid ──────────────────────────── */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="section-eyebrow">Sub-modules</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Available features
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SUB_MODULES.map(({id, label, description, href, icon: Icon, active, iconBg}) =>
            active ? (
              <Link
                key={id}
                href={href}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800/60"
              >
                <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-0 transition-opacity group-hover:opacity-60" />

                <div className="relative flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
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
            ) : (
              <div
                key={id}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-white/40 p-6 dark:border-zinc-800/70 dark:bg-zinc-900/40"
              >
                <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />

                <div className="relative flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl opacity-50 ${iconBg}`}>
                    <Icon size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/60 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500">
                    <Lock size={9} />
                    Coming soon
                  </span>
                </div>

                <div className="relative mt-5 flex-1">
                  <h3 className="text-base font-semibold tracking-tight text-zinc-500 dark:text-zinc-500">
                    {label}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
                    {description}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
