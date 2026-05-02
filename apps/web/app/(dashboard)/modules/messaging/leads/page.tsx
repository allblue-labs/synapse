import { UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const leads = [
  { name: 'Marina Costa', intent: 'Enterprise pricing', confidence: '0.84', state: 'Qualified' },
  { name: 'Ana Martins', intent: 'Product walkthrough', confidence: '0.77', state: 'Nurture' }
];

export default function MessagingLeadsPage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      {leads.length === 0 ? (
        <EmptyState icon={UsersRound} title="No captured leads" description="Lead records will appear after the messaging module extracts qualified buying signals." />
      ) : null}
      <section className="rounded-md border border-line bg-bone shadow-panel">
        <div className="border-b border-line p-5">
          <h2 className="text-2xl font-semibold text-ink">Captured leads</h2>
          <p className="mt-1 text-sm text-graphite/65">Structured lead signals produced by module conversations.</p>
        </div>
        <div className="divide-y divide-line">
          {leads.map((lead) => (
            <div key={lead.name} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_220px_140px_120px] md:items-center">
              <p className="font-semibold text-ink">{lead.name}</p>
              <p className="text-sm text-graphite/70">{lead.intent}</p>
              <p className="text-sm font-medium text-ink">{lead.confidence}</p>
              <Badge tone="success">{lead.state}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
