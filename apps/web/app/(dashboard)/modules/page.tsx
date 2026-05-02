import { Component, LockKeyhole, Power, Workflow } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SampleDataBanner } from '@/components/ui/sample-data-banner';

const moduleActions = ['messaging.receive_inbound', 'messaging.send_outbound', 'messaging.capture_lead'];

export default function ModulesPage() {
  return (
    <div className="space-y-6">
      <SampleDataBanner />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium uppercase text-signal">Module system</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-ink">Capabilities without core pollution</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-graphite/72">
            Modules register actions, events, and permissions, then consume core intelligence and orchestration through stable contracts.
          </p>
        </div>
        <Button variant="secondary">
          <Workflow className="h-4 w-4" aria-hidden="true" />
          View lifecycle
        </Button>
      </div>

      <section className="rounded-md border border-line bg-bone shadow-panel">
        <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
          <div className="border-b border-line p-6 lg:border-b-0 lg:border-r">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-ink text-white">
              <Component className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-ink">Messaging</h2>
            <p className="mt-2 text-sm leading-6 text-graphite/70">The first real Synapse module. It owns channels, conversations, message normalization, lead capture, and conversation state.</p>
            <div className="mt-5 flex items-center gap-2">
              <Badge tone="success">Enabled</Badge>
              <Badge tone="info">v0.1.0</Badge>
            </div>
            <Link
              href="/modules/messaging"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white transition hover:bg-graphite focus:outline-none focus:ring-2 focus:ring-ink/20"
            >
              Open module
            </Link>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-line bg-white/70 p-4">
                <Power className="h-4 w-4 text-signal" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">Lifecycle</p>
                <p className="mt-2 text-sm leading-6 text-graphite/70">Register, enable, disable, list.</p>
              </div>
              <div className="rounded-md border border-line bg-white/70 p-4">
                <LockKeyhole className="h-4 w-4 text-gold" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">Permissions</p>
                <p className="mt-2 text-sm leading-6 text-graphite/70">Read, write, channels, conversations.</p>
              </div>
              <div className="rounded-md border border-line bg-white/70 p-4">
                <Workflow className="h-4 w-4 text-pulse" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">Events</p>
                <p className="mt-2 text-sm leading-6 text-graphite/70">Message received and state changed.</p>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-sm font-semibold text-ink">Registered actions</p>
              <div className="mt-3 divide-y divide-line rounded-md border border-line bg-white/70">
                {moduleActions.map((action) => (
                  <div key={action} className="flex items-center justify-between gap-3 px-4 py-3">
                    <code className="text-sm text-graphite">{action}</code>
                    <Badge>2026-05-02</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
