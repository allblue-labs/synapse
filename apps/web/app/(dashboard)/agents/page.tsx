import { BrainCircuit, CircleGauge, MoreHorizontal, Plus, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const agents = [
  { name: 'Revenue Orchestrator', goal: 'Sales', model: 'OpenAI · gpt-4.1-mini', status: 'ACTIVE', conversations: 84, policy: 'Cost-aware' },
  { name: 'Support Navigator', goal: 'Support', model: 'OpenAI · gpt-4.1-mini', status: 'ACTIVE', conversations: 41, policy: 'Low latency' },
  { name: 'Booking Strategist', goal: 'Booking', model: 'OpenAI · gpt-4.1-mini', status: 'DRAFT', conversations: 0, policy: 'Review required' }
];

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      <section className="rounded-md border border-line bg-ink p-7 text-white shadow-lift">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium uppercase text-signal">Agent layer</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal">Reusable intelligence, routed through core.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/64">
              Agents define goals, behavior, and policy. Modules invoke them through orchestration instead of owning model calls.
            </p>
          </div>
          <Button className="bg-white text-ink hover:bg-mist">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New agent
          </Button>
        </div>
      </section>

      <section className="rounded-md border border-line bg-bone shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </Button>
            <Button variant="ghost">Active</Button>
            <Button variant="ghost">Drafts</Button>
          </div>
          <p className="text-sm text-graphite/65">3 agents</p>
        </div>
        <div className="divide-y divide-line">
          {agents.map((agent) => (
            <div key={agent.name} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_170px_170px_48px] md:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink text-white">
                  <BrainCircuit className="h-5 w-5 text-signal" aria-hidden="true" />
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
                  <p className="text-xs text-graphite/60">{agent.policy}</p>
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
        <EmptyState icon={BrainCircuit} title="No agents yet" description="Create a reusable intelligence profile for modules to invoke through core orchestration." actionLabel="Create agent" />
      ) : null}
    </div>
  );
}
