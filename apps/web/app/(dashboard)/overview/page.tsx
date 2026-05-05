import Link from 'next/link';
import Image from 'next/image';
import {MessageSquare, Zap, ArrowRight, Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Overview'};

const MODULES = [
  {
    id: 'messaging',
    label: 'Messaging',
    description: 'Connect messaging channels, automate conversations and capture structured data with AI agents.',
    href: '/modules/messaging',
    icon: MessageSquare,
    active: true,
    features: ['WhatsApp', 'Telegram', 'ClinicFlow AI'],
  },
  {
    id: 'automation',
    label: 'Automation',
    description: 'Build multi-step workflows triggered by events.',
    href: '#',
    icon: Zap,
    active: false,
    features: ['Workflows', 'Triggers', 'Actions'],
  },
] as const;

function ModuleGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MODULES.map(({id, label, description, href, icon: Icon, active, features}) => (
        <Link
          key={id}
          href={href}
          className={
            active
              ? 'group rounded-xl border border-zinc-200 bg-white/60 p-6 transition hover:border-brand-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-brand-700'
              : 'rounded-xl border border-zinc-100 bg-zinc-50/40 p-6 dark:border-zinc-800/50 dark:bg-zinc-900/20 cursor-not-allowed'
          }
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
              <Icon size={20} />
            </div>
            <Badge variant={active ? 'active' : 'inactive'}>
              {active ? 'Active' : 'Coming Soon'}
            </Badge>
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{label}</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {features.map((f) => (
              <span
                key={f}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {f}
              </span>
            ))}
          </div>
          {active && (
            <div className="mt-5 flex items-center gap-1 text-xs font-medium text-brand-600 opacity-0 transition group-hover:opacity-100 dark:text-brand-400">
              Open <ArrowRight size={12} />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-12 flex items-start gap-6">
        <Image
          src="/logo.png"
          alt="Synapse"
          width={56}
          height={56}
          className="rounded-2xl shadow-md mt-1"
        />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            AI-powered conversational agents
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Orchestrate AI agents, automate messaging workflows and capture structured data — all from one platform.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/modules"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              Open Modules
            </Link>
            <Button variant="secondary" size="md">
              <Plus size={15} />
              Create Agent
            </Button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Modules
        </h2>
        <ModuleGrid />
      </section>
    </div>
  );
}
