import Link from 'next/link';
import {MessageSquare, Zap, Bot, BarChart2, ArrowRight} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Modules'};

const ALL_MODULES = [
  {
    id: 'messaging',
    label: 'Messaging',
    description: 'Connect messaging channels, automate conversations and capture structured data with AI agents.',
    href: '/modules/messaging',
    icon: MessageSquare,
    active: true,
    features: ['WhatsApp', 'Telegram', 'AI Agents', 'ClinicFlow AI'],
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    id: 'automation',
    label: 'Automation',
    description: 'Build event-driven workflows that execute across modules and external services.',
    href: '#',
    icon: Zap,
    active: false,
    features: ['Event triggers', 'Multi-step workflows', 'Conditions'],
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    id: 'agents',
    label: 'Agents',
    description: 'Define, deploy and monitor custom AI agents with domain-specific knowledge.',
    href: '#',
    icon: Bot,
    active: false,
    features: ['Custom agents', 'Knowledge base', 'Tool use'],
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Track conversation outcomes, agent metrics and export data for reporting.',
    href: '#',
    icon: BarChart2,
    active: false,
    features: ['Conversation logs', 'Agent performance', 'Exports'],
    color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  },
] as const;

export default function ModulesPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Modules
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Browse and enable platform modules.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ALL_MODULES.map(({id, label, description, href, icon: Icon, active, features, color}) => (
          <div
            key={id}
            className={
              active
                ? 'group rounded-xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/60'
                : 'rounded-xl border border-zinc-100 bg-zinc-50/40 p-6 dark:border-zinc-800/50 dark:bg-zinc-900/20'
            }
          >
            <div className="mb-4 flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <Icon size={20} />
              </div>
              <Badge variant={active ? 'active' : 'inactive'}>
                {active ? 'Active' : 'Coming Soon'}
              </Badge>
            </div>

            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{label}</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {description}
            </p>

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
              <div className="mt-5">
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  Open <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
