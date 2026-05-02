import { FileText, Link as LinkIcon, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const documents = [
  { title: 'Enterprise pricing policy', scope: 'Sales qualifier', source: 'Internal document', updated: 'Today' },
  { title: 'Refund and billing rules', scope: 'Support concierge', source: 'Help center', updated: 'Yesterday' },
  { title: 'Implementation checklist', scope: 'All agents', source: 'Operations playbook', updated: 'Apr 29' }
];

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium uppercase text-signal">Knowledge</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Customer context for better answers</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite/70">
            Knowledge items are tenant-scoped and can optionally attach to a specific agent.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add source
        </Button>
      </div>

      <section className="rounded-md border border-ink/10 bg-white shadow-panel">
        <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-4">
          <Search className="h-4 w-4 text-graphite/55" aria-hidden="true" />
          <input className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search knowledge sources" />
        </div>
        <div className="divide-y divide-ink/10">
          {documents.map((document) => (
            <div key={document.title} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_180px_130px] md:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mist">
                  <FileText className="h-5 w-5 text-pulse" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-ink">{document.title}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-graphite/65">
                    <LinkIcon className="h-4 w-4" aria-hidden="true" />
                    {document.source}
                  </div>
                </div>
              </div>
              <Badge tone={document.scope === 'All agents' ? 'info' : 'neutral'}>{document.scope}</Badge>
              <p className="text-sm text-graphite/65">{document.updated}</p>
            </div>
          ))}
        </div>
      </section>
      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No knowledge sources" description="Add policies, product details, FAQs, or playbooks so agents can answer with customer-specific context." actionLabel="Add source" />
      ) : null}
    </div>
  );
}
