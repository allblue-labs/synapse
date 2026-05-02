import { RadioTower } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MessagingSubnav } from '@/components/modules/messaging/messaging-subnav';

export default function MessagingModuleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-bone shadow-panel">
        <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-signal" aria-hidden="true" />
              <p className="text-sm font-medium uppercase text-signal">Messaging module</p>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink md:text-4xl">Messaging orchestration</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-graphite/70">
              Channel communication, conversation state, lead capture, and automations live inside this module while sharing Synapse core intelligence.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="success">Enabled</Badge>
            <Badge tone="info">Native module</Badge>
          </div>
        </div>
        <MessagingSubnav />
      </section>
      {children}
    </div>
  );
}
