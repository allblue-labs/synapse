import { ArrowUpRight, MessageSquareText, RadioTower, UsersRound, Workflow } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Metric } from '@/components/ui/metric';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const activity = [
  'Telegram message normalized and persisted',
  'Revenue Orchestrator selected for lead qualification',
  'Lead confidence updated to 0.84'
];

export default function MessagingOverviewPage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      <section className="overflow-hidden rounded-md border border-line bg-bone shadow-panel">
        <div className="grid border-b border-line sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Open conversations" value="126" detail="Across active channels" />
          <Metric label="Captured leads" value="38" detail="12 ready for handoff" />
          <Metric label="Channels" value="3" detail="Telegram, WhatsApp, Discord" />
          <Metric label="Automations" value="4" detail="2 active workflows" />
        </div>
        <div className="grid gap-0 lg:grid-cols-[1fr_380px]">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-ink">Quick actions</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                [MessageSquareText, 'Review conversations', '/modules/messaging/conversations'],
                [UsersRound, 'Inspect leads', '/modules/messaging/leads'],
                [RadioTower, 'Manage channels', '/modules/messaging/channels'],
                [Workflow, 'Edit automations', '/modules/messaging/automations']
              ].map(([Icon, label, href]) => (
                <Link key={label as string} href={href as string} className="group rounded-md border border-line bg-white/70 p-4 transition hover:border-ink/25 hover:bg-white">
                  <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{label as string}</p>
                    <ArrowUpRight className="h-4 w-4 text-graphite/45 transition group-hover:text-ink" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <aside className="border-t border-line p-6 lg:border-l lg:border-t-0">
            <h2 className="text-xl font-semibold text-ink">Recent activity</h2>
            <div className="mt-5 space-y-4">
              {activity.map((item) => (
                <div key={item} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
                  <p className="text-sm leading-6 text-graphite/75">{item}</p>
                </div>
              ))}
            </div>
            <Button className="mt-6" variant="secondary">View activity</Button>
          </aside>
        </div>
      </section>
    </div>
  );
}
