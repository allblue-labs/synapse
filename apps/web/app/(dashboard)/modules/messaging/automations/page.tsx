import { Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const automations = [
  { name: 'Lead qualification route', trigger: 'message.received', status: 'Active' },
  { name: 'Human handoff suggestion', trigger: 'confidence.low', status: 'Draft' }
];

export default function MessagingAutomationsPage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      {automations.length === 0 ? (
        <EmptyState icon={Workflow} title="No automations yet" description="Create module workflows that react to normalized messages, lead signals, or conversation state." actionLabel="Create automation" />
      ) : null}
      <section className="rounded-md border border-line bg-bone shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Messaging automations</h2>
            <p className="mt-1 text-sm text-graphite/65">Workflow hooks owned by the messaging module.</p>
          </div>
          <Button>Create automation</Button>
        </div>
        <div className="divide-y divide-line">
          {automations.map((automation) => (
            <div key={automation.name} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_240px_120px] md:items-center">
              <p className="font-semibold text-ink">{automation.name}</p>
              <code className="text-sm text-graphite/70">{automation.trigger}</code>
              <Badge tone={automation.status === 'Active' ? 'success' : 'neutral'}>{automation.status}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
