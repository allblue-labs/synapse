import {Suspense} from 'react';
import {ListChecks} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import {QueueClient} from './queue-client';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Validation Queue — ClinicFlow AI'};

export default function QueuePage() {
  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        eyebrow="ClinicFlow · Workspace"
        title="Validation Queue"
        description="Review incoming WhatsApp scheduling requests. Validate AI-extracted data and approve confirmed appointments."
        icon={<ListChecks size={26} />}
        iconGradient="from-brand-500 to-indigo-500"
        glowColor="bg-brand-500/15"
      />

      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-zinc-400 dark:border-zinc-800">
            Loading queue…
          </div>
        }
      >
        <QueueClient />
      </Suspense>
    </div>
  );
}
