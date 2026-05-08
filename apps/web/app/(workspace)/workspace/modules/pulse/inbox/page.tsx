import {Suspense} from 'react';
import {Inbox} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import {QueueClient} from './queue-client';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Inbox — Pulse'};

export default function PulseInboxPage() {
  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        eyebrow="Pulse · Workspace"
        title="Inbox"
        description="The operational queue. Review incoming items, validate AI-extracted context, approve or escalate — never a chat mirror."
        icon={<Inbox size={26} />}
        iconGradient="from-brand-500 to-accent-500"
        glowColor="bg-brand-500/15"
      />

      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-zinc-400 dark:border-zinc-800">
            Loading inbox…
          </div>
        }
      >
        <QueueClient />
      </Suspense>
    </div>
  );
}
