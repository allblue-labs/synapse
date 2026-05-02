import { RadioTower } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const channels = [
  { name: 'Telegram Sales', type: 'Telegram', status: 'Active', mode: 'Webhook' },
  { name: 'WhatsApp Provider', type: 'WhatsApp', status: 'Stub', mode: 'Provider abstraction' },
  { name: 'Discord Community', type: 'Discord', status: 'Stub', mode: 'Signature pending' }
];

export default function MessagingChannelsPage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      {channels.length === 0 ? (
        <EmptyState icon={RadioTower} title="No channels connected" description="Connect Telegram first, then add WhatsApp or Discord providers through the adapter contract." actionLabel="Connect channel" />
      ) : null}
      <section className="rounded-md border border-line bg-bone shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Channel adapters</h2>
            <p className="mt-1 text-sm text-graphite/65">Provider-specific transport stays inside the messaging module.</p>
          </div>
          <Button>Connect channel</Button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {channels.map((channel) => (
            <div key={channel.name} className="rounded-md border border-line bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-ink">{channel.name}</p>
                <Badge tone={channel.status === 'Active' ? 'success' : 'neutral'}>{channel.status}</Badge>
              </div>
              <p className="mt-4 text-sm text-graphite/70">{channel.type}</p>
              <p className="mt-1 text-sm text-graphite/55">{channel.mode}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
