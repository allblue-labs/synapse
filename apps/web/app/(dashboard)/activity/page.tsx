import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const events = [
  { name: 'module_registered', scope: 'messaging', time: 'Today' },
  { name: 'llm_route_selected', scope: 'core.intelligence', time: 'Today' },
  { name: 'http_request_completed', scope: 'observability', time: 'Today' }
];

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      <div>
        <p className="text-sm font-medium uppercase text-signal">Activity</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal text-ink">Platform event stream</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-graphite/70">Core and module events appear here without exposing module internals as global navigation.</p>
      </div>
      {events.length === 0 ? (
        <EmptyState icon={Activity} title="No platform activity" description="Core and module events will appear as workflows, queues, and integrations run." />
      ) : null}
      <section className="rounded-md border border-line bg-bone shadow-panel">
        <div className="divide-y divide-line">
          {events.map((event) => (
            <div key={event.name} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_220px_120px] md:items-center">
              <code className="text-sm font-medium text-ink">{event.name}</code>
              <p className="text-sm text-graphite/70">{event.scope}</p>
              <p className="text-sm text-graphite/55">{event.time}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
