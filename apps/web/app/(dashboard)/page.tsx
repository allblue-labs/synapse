import { ArrowUpRight, Bot, MessageSquareText, Radio, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Metric } from '@/components/ui/metric';

const operatingFeed = [
  { label: 'Lead qualified', detail: 'Marina from Telegram matched enterprise buying intent.', time: '2m' },
  { label: 'Escalation suggested', detail: 'Support agent detected billing risk in active conversation.', time: '8m' },
  { label: 'Knowledge used', detail: 'Pricing policy article injected into sales response.', time: '14m' }
];

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-panel">
        <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="p-6 md:p-8">
            <Badge tone="success">Live operations</Badge>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal text-ink md:text-5xl">
              AI agents that move conversations toward revenue, support, and action.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-graphite/75">
              Synapse gives teams a single command center for agent behavior, channel conversations, lead signals, and business outcomes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button>
                Open conversations
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="secondary">Configure agent</Button>
            </div>
          </div>
          <div className="border-t border-ink/10 bg-ink p-6 text-white lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white/80">Outcome pipeline</p>
              <Radio className="h-4 w-4 text-signal" aria-hidden="true" />
            </div>
            <div className="mt-8 space-y-4">
              {['Captured intent', 'Qualified lead', 'Booked action', 'Human review'].map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="h-2 flex-1 rounded-full bg-white/12">
                    <div className="h-2 rounded-full bg-signal" style={{ width: `${88 - index * 14}%` }} />
                  </div>
                  <span className="w-28 text-sm text-white/75">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid border-t border-ink/10 bg-white sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Active agents" value="6" detail="4 channels connected" />
          <Metric label="Qualified leads" value="128" detail="+18% this week" />
          <Metric label="Avg. response" value="1.8s" detail="Across all channels" />
          <Metric label="Escalations" value="14" detail="7 awaiting review" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="rounded-md border border-ink/10 bg-white p-6 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Agent fleet</h2>
              <p className="mt-1 text-sm text-graphite/70">Business agents grouped by active outcome.</p>
            </div>
            <Button variant="secondary">View all</Button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ['Sales qualifier', 'Sales', 'ACTIVE', Bot],
              ['Support concierge', 'Support', 'ACTIVE', ShieldCheck],
              ['Booking assistant', 'Booking', 'DRAFT', MessageSquareText]
            ].map(([name, goal, status, Icon]) => (
              <div key={name as string} className="rounded-md border border-ink/10 p-4">
                <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
                <p className="mt-4 text-sm font-semibold text-ink">{name as string}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-graphite/65">{goal as string}</span>
                  <Badge tone={status === 'ACTIVE' ? 'success' : 'neutral'}>{status as string}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-ink/10 bg-white p-6 shadow-panel">
          <h2 className="text-xl font-semibold text-ink">Operating feed</h2>
          <div className="mt-5 space-y-5">
            {operatingFeed.map((item) => (
              <div key={item.label} className="border-b border-ink/10 pb-5 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <span className="text-xs text-graphite/55">{item.time}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-graphite/70">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
