import { ArrowUpRight, Bot, Clock, MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const conversations = [
  { name: 'Marina Costa', channel: 'Telegram', agent: 'Sales qualifier', status: 'ACTIVE', preview: 'Asked about enterprise pricing and rollout timeline.', time: '2m' },
  { name: 'Rafael Lima', channel: 'Telegram', agent: 'Support concierge', status: 'ESCALATED', preview: 'Subscription invoice mismatch needs human review.', time: '8m' },
  { name: 'Ana Martins', channel: 'WhatsApp', agent: 'Booking assistant', status: 'ACTIVE', preview: 'Wants to schedule a product walkthrough next week.', time: '19m' }
];

export default function ConversationsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="rounded-md border border-ink/10 bg-white shadow-panel">
        <div className="border-b border-ink/10 p-5">
          <p className="text-sm font-medium uppercase text-signal">Inbox</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Conversations</h1>
        </div>
        <div className="divide-y divide-ink/10">
          {conversations.map((conversation) => (
            <button key={conversation.name} className="block w-full px-5 py-4 text-left transition hover:bg-mist">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{conversation.name}</p>
                <span className="text-xs text-graphite/55">{conversation.time}</span>
              </div>
              <p className="mt-1 text-xs text-graphite/60">{conversation.channel} · {conversation.agent}</p>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-graphite/75">{conversation.preview}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="min-h-[680px] rounded-md border border-ink/10 bg-white shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-ink">Marina Costa</h2>
            <p className="mt-1 text-sm text-graphite/65">Telegram · Sales qualifier</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="success">ACTIVE</Badge>
            <Button variant="secondary">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              Open lead
            </Button>
          </div>
        </div>
        <div className="grid min-h-[620px] lg:grid-cols-[1fr_320px]">
          <div className="space-y-5 p-6">
            <div className="max-w-xl rounded-md bg-mist px-4 py-3">
              <p className="text-sm leading-6 text-graphite">Hi, I want to understand if Synapse can qualify inbound leads from Telegram and send them to sales.</p>
            </div>
            <div className="ml-auto max-w-xl rounded-md bg-ink px-4 py-3 text-white">
              <p className="text-sm leading-6">Yes. Synapse can qualify Telegram conversations, extract lead fields, and route high-intent contacts to your team.</p>
            </div>
            <div className="max-w-xl rounded-md bg-mist px-4 py-3">
              <p className="text-sm leading-6 text-graphite">Can it identify enterprise leads before a human joins?</p>
            </div>
          </div>
          <aside className="border-t border-ink/10 p-6 lg:border-l lg:border-t-0">
            <h3 className="font-semibold text-ink">Lead signals</h3>
            <div className="mt-5 space-y-4">
              {[
                ['Intent', 'Enterprise pricing'],
                ['Company size', '51-200'],
                ['Urgency', 'This quarter']
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-ink/10 pb-3">
                  <span className="text-sm text-graphite/65">{label}</span>
                  <span className="text-sm font-medium text-ink">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-md bg-mist p-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-signal" aria-hidden="true" />
                <p className="text-sm font-medium text-ink">Agent suggestion</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-graphite/75">Ask for CRM, timeline, and expected monthly volume before booking sales.</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-graphite/55">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Last updated 2 minutes ago
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
