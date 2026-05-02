import { Bot, CircleGauge, MoreHorizontal, Plus, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const agents = [
  { name: 'Sales qualifier', goal: 'Sales', model: 'OpenAI / gpt-4.1-mini', status: 'ACTIVE', conversations: 84 },
  { name: 'Support concierge', goal: 'Support', model: 'OpenAI / gpt-4.1-mini', status: 'ACTIVE', conversations: 41 },
  { name: 'Booking assistant', goal: 'Booking', model: 'OpenAI / gpt-4.1-mini', status: 'DRAFT', conversations: 0 },
  { name: 'Renewal guide', goal: 'Automation', model: 'OpenAI / gpt-4.1-mini', status: 'PAUSED', conversations: 16 }
];

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium uppercase text-signal">Agents</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Configure business behavior</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite/70">
            Each agent owns a goal, personality, rules, model settings, and knowledge scope.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New agent
        </Button>
      </div>

      <section className="rounded-md border border-ink/10 bg-white shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </Button>
            <Button variant="ghost">Active</Button>
            <Button variant="ghost">Drafts</Button>
          </div>
          <p className="text-sm text-graphite/65">4 agents</p>
        </div>
        <div className="divide-y divide-ink/10">
          {agents.map((agent) => (
            <div key={agent.name} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_180px_160px_48px] md:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mist">
                  <Bot className="h-5 w-5 text-signal" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-ink">{agent.name}</p>
                  <p className="mt-1 text-sm text-graphite/65">{agent.model}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-graphite/50">Goal</p>
                <p className="mt-1 text-sm font-medium text-graphite">{agent.goal}</p>
              </div>
              <div className="flex items-center gap-3">
                <CircleGauge className="h-4 w-4 text-pulse" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-ink">{agent.conversations}</p>
                  <p className="text-xs text-graphite/60">conversations</p>
                </div>
                <Badge tone={agent.status === 'ACTIVE' ? 'success' : 'neutral'}>{agent.status}</Badge>
              </div>
              <Button variant="ghost" className="h-10 w-10 px-0" title="Agent actions">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </section>
      {agents.length === 0 ? (
        <EmptyState icon={Bot} title="No agents yet" description="Create your first outcome-focused agent and connect it to a channel when ready." actionLabel="Create agent" />
      ) : null}
    </div>
  );
}
