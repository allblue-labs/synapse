import { ArrowUpRight, Bot, Clock, MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const conversations = [
  { name: 'Marina Costa', channel: 'Telegram', agent: 'Revenue Orchestrator', status: 'ACTIVE', state: 'QUALIFYING', preview: 'Asked about enterprise pricing and rollout timeline.', time: '2m' },
  { name: 'Rafael Lima', channel: 'Telegram', agent: 'Support Navigator', status: 'ESCALATED', state: 'READY_FOR_HANDOFF', preview: 'Subscription invoice mismatch needs human review.', time: '8m' },
  { name: 'Ana Martins', channel: 'WhatsApp', agent: 'Booking Strategist', status: 'ACTIVE', state: 'WAITING_ON_USER', preview: 'Wants to schedule a product walkthrough next week.', time: '19m' }
];

export default function MessagingConversationsPage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      {conversations.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No messaging conversations" description="Inbound module events will appear here after a channel webhook is connected." />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <section className="rounded-md border border-line bg-bone shadow-panel">
          <div className="border-b border-line p-5">
            <h2 className="text-2xl font-semibold tracking-normal text-ink">Conversation state</h2>
            <p className="mt-1 text-sm text-graphite/65">Module-owned conversation operations.</p>
          </div>
          <div className="divide-y divide-line">
            {conversations.map((conversation) => (
              <button key={conversation.name} className="block w-full px-5 py-4 text-left transition hover:bg-white/70">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{conversation.name}</p>
                  <span className="text-xs text-graphite/55">{conversation.time}</span>
                </div>
                <p className="mt-1 text-xs text-graphite/60">{conversation.channel} · {conversation.agent}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge tone={conversation.status === 'ESCALATED' ? 'warning' : 'success'}>{conversation.status}</Badge>
                  <Badge>{conversation.state}</Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-graphite/75">{conversation.preview}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="min-h-[640px] rounded-md border border-line bg-bone shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-ink">Marina Costa</h2>
              <p className="mt-1 text-sm text-graphite/65">Telegram · Revenue Orchestrator · QUALIFYING</p>
            </div>
            <Button variant="secondary">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              Open lead
            </Button>
          </div>
          <div className="grid min-h-[580px] lg:grid-cols-[1fr_330px]">
            <div className="space-y-5 p-6">
              <div className="max-w-xl rounded-md bg-white px-4 py-3 shadow-sm">
                <p className="text-sm leading-6 text-graphite">Can Synapse qualify Telegram leads and route them to sales?</p>
              </div>
              <div className="ml-auto max-w-xl rounded-md bg-ink px-4 py-3 text-white">
                <p className="text-sm leading-6">Yes. The messaging module normalizes the message, core selects the agent route, and lead signals are captured for handoff.</p>
              </div>
            </div>
            <aside className="border-t border-line p-6 lg:border-l lg:border-t-0">
              <h3 className="font-semibold text-ink">Lead capture</h3>
              <div className="mt-5 space-y-4">
                {[
                  ['Intent', 'Enterprise pricing'],
                  ['Company size', '51-200'],
                  ['Urgency', 'This quarter'],
                  ['Confidence', '0.84']
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-b border-line pb-3">
                    <span className="text-sm text-graphite/65">{label}</span>
                    <span className="text-sm font-medium text-ink">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-md bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-signal" aria-hidden="true" />
                  <p className="text-sm font-medium text-ink">Core recommendation</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-graphite/75">Ask for CRM, timeline, and expected monthly volume before sales handoff.</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-graphite/55">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Module event received 2 minutes ago
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
