import Link from 'next/link';
import {Bot, Plus, ArrowUpRight, Zap, MessageSquare, BookOpen} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import {Can} from '@/components/auth/can';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Agents'};

const AGENT_TEMPLATES = [
  {
    icon: MessageSquare,
    label: 'Scheduling Agent',
    description: 'Handles appointment booking via WhatsApp with AI transcription and calendar sync.',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    icon: Zap,
    label: 'Triage Agent',
    description: 'Classifies incoming messages by intent and routes to the appropriate workflow.',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    icon: Bot,
    label: 'Custom Agent',
    description: 'Start from scratch with your own prompt, tools and knowledge base.',
    iconBg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  },
] as const;

export default function AgentsPage() {
  return (
    <div className="animate-fade-in space-y-10">

      <PageHeader
        eyebrow="AI Workers"
        title="Agents"
        description="AI workers deployed to specific modules. Each agent handles a defined task autonomously."
        icon={<Bot size={26} />}
        iconGradient="from-indigo-500 to-violet-500"
        glowColor="bg-indigo-500/15"
        actions={
          <Can permission="agents:write">
            <button type="button" className="btn-primary h-9 px-4 text-xs">
              <Plus size={13} />
              New agent
            </button>
          </Can>
        }
      />

      {/* Empty state */}
      <section className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-white/40 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-50" />

        <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-500 ring-1 ring-zinc-200 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-400 dark:ring-zinc-700">
          <Bot size={24} />
        </div>
        <h2 className="relative mt-5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          No agents yet
        </h2>
        <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Agents are AI workers that run continuously inside a module. Start from a template or build your own.
        </p>
        <Can
          permission="agents:write"
          fallback={
            <p className="relative mt-6 text-xs text-zinc-400 dark:text-zinc-600">
              You don&apos;t have permission to create agents. Ask an admin.
            </p>
          }
        >
          <button type="button" className="btn-primary relative mt-6 h-10 px-5">
            <Plus size={14} />
            Create your first agent
          </button>
        </Can>
      </section>

      {/* Templates */}
      <section>
        <div className="mb-5">
          <p className="section-eyebrow">Templates</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Start from a template
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {AGENT_TEMPLATES.map(({icon: Icon, label, description, iconBg}) => (
            <button
              key={label}
              type="button"
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800/60"
            >
              <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-0 transition-opacity group-hover:opacity-60" />

              <div className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon size={20} />
              </div>
              <p className="relative mt-5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{label}</p>
              <p className="relative mt-1.5 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
              <div className="relative mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
                  Use template
                </span>
                <ArrowUpRight
                  size={14}
                  className="text-zinc-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600 dark:group-hover:text-brand-400"
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Learn more */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-950/60 dark:text-brand-400 dark:ring-brand-900/40">
            <BookOpen size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">What are agents?</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Agents are configured AI workers connected to a module. They process incoming events,
              call tools, and produce structured outputs — without manual intervention.
            </p>
            <Link
              href="/modules"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Browse modules <ArrowUpRight size={11} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
