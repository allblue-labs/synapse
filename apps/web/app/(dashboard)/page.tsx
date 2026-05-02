import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Bot, Cable, Component, MessageSquareText, RadioTower, ShieldAlert, Sparkles, Workflow, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const moduleCards = [
  {
    name: 'Messages',
    href: '/modules/messaging',
    icon: MessageSquareText,
    status: 'Available',
    description: 'Connect channels, capture leads, and route conversations through intelligent agents.'
  },
  {
    name: 'Operations',
    href: '/modules',
    icon: Wrench,
    status: 'Planned',
    description: 'Coordinate tasks, approvals, and internal execution from agent-triggered workflows.'
  },
  {
    name: 'Incidents',
    href: '/modules',
    icon: ShieldAlert,
    status: 'Planned',
    description: 'Detect, triage, and escalate operational incidents with context-aware automation.'
  }
];

const quickStarts = [
  { title: 'Create the first agent', detail: 'Define goals, behavior, and routing policy.', href: '/agents', icon: Bot },
  { title: 'Open messaging module', detail: 'Review conversations, channels, leads, and automations.', href: '/modules/messaging', icon: MessageSquareText },
  { title: 'Connect a channel', detail: 'Start with Telegram, then add WhatsApp or Discord.', href: '/modules/messaging/channels', icon: Cable }
];

export default function OverviewPage() {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-md border border-line bg-bone shadow-panel">
        <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="p-7 md:p-12">
            <Image
              src="/synapse-logo.PNG"
              alt="Synapse"
              width={92}
              height={92}
              className="h-20 w-20 rounded-2xl object-cover shadow-lift md:h-24 md:w-24"
              priority
            />
            <Badge tone="success" className="mt-8">Platform entry</Badge>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-normal text-ink md:text-7xl">
              Manage your business with intelligent agents.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-graphite/72">
              Synapse connects AI, workflows, and modules to automate decisions and actions across your enterprise.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/agents"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-medium text-white transition hover:bg-graphite focus:outline-none focus:ring-2 focus:ring-ink/20"
              >
                Start now
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/modules"
                className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-5 text-sm font-medium text-ink transition hover:bg-mist focus:outline-none focus:ring-2 focus:ring-ink/20"
              >
                Explore modules
              </Link>
            </div>
          </div>

          <div className="border-t border-line bg-ink p-6 text-white lg:border-l lg:border-t-0 md:p-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white/76">Core concept</p>
              <Sparkles className="h-4 w-4 text-signal" aria-hidden="true" />
            </div>
            <div className="mt-10 space-y-4">
              {[
                [Bot, 'Agent', 'Understands goals, rules, and context.'],
                [Workflow, 'Decision', 'Routes tasks through the LLM pool and workflow engine.'],
                [RadioTower, 'Action', 'Executes through modules like messaging, ops, or incidents.']
              ].map(([Icon, title, detail], index) => (
                <div key={title as string} className="grid grid-cols-[44px_1fr] gap-4 rounded-md border border-white/10 bg-white/7 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-ink">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-signal">0{index + 1}</span>
                      <p className="font-semibold text-white">{title as string}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/62">{detail as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-medium uppercase text-signal">Main concept</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Agents decide. Modules execute.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-graphite/70">
            The core stays focused on intelligence and orchestration. Every business capability is delivered as a native module.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {['Agent', 'Decision', 'Action'].map((item, index) => (
            <div key={item} className="rounded-md border border-line bg-bone p-5 shadow-panel">
              <span className="text-xs font-semibold text-signal">0{index + 1}</span>
              <p className="mt-5 text-lg font-semibold text-ink">{item}</p>
              <p className="mt-2 text-sm leading-6 text-graphite/68">
                {index === 0 && 'Configure goals, instructions, and operating style.'}
                {index === 1 && 'Use context and model routing to choose the next move.'}
                {index === 2 && 'Run workflows through connected business modules.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium uppercase text-signal">Modules</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Start with messaging. Expand by capability.</h2>
          </div>
          <Link href="/modules" className="text-sm font-medium text-ink hover:text-signal">View all modules</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {moduleCards.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.name} href={module.href} className="group rounded-md border border-line bg-bone p-5 shadow-panel transition hover:border-ink/25 hover:bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white">
                    <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
                  </div>
                  <Badge tone={module.status === 'Available' ? 'success' : 'neutral'}>{module.status}</Badge>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{module.name}</h3>
                <p className="mt-2 min-h-20 text-sm leading-6 text-graphite/70">{module.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-ink transition group-hover:text-signal">
                  Open module
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-md border border-line bg-bone p-6 shadow-panel md:p-7">
          <p className="text-sm font-medium uppercase text-signal">How it works</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['Configure agents', 'Set business goals and behavior.'],
              ['Connect modules', 'Add capabilities like messaging.'],
              ['Automate execution', 'Let workflows move work forward.']
            ].map(([title, detail], index) => (
              <div key={title} className="border-l border-line pl-4">
                <span className="text-xs font-semibold text-signal">0{index + 1}</span>
                <p className="mt-3 font-semibold text-ink">{title}</p>
                <p className="mt-2 text-sm leading-6 text-graphite/70">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-ink p-6 text-white shadow-lift md:p-7">
          <div className="flex items-center gap-2">
            <Component className="h-4 w-4 text-signal" aria-hidden="true" />
            <p className="text-sm font-medium text-white/76">Quick start</p>
          </div>
          <div className="mt-5 space-y-3">
            {quickStarts.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} className="group flex gap-3 rounded-md border border-white/10 bg-white/7 p-4 transition hover:bg-white/10">
                  <Icon className="mt-1 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/60">{item.detail}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
