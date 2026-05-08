import {Cpu} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Runtime — Platform'};

export default function PlatformRuntimePage() {
  return (
    <PendingSection
      eyebrow="Platform · Control center"
      title="Runtime"
      description="Operational visibility into the execution pipeline — queue depth, worker health, AI usage, error rates."
      icon={<Cpu size={26} />}
      iconGradient="from-indigo-500 to-violet-500"
      glowColor="bg-indigo-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'BullMQ queue depth + processing rate per worker.',
        'Execution lifecycle: REQUESTED / QUEUED / RUNNING / SUCCEEDED / FAILED / TIMED_OUT.',
        'AI usage by tenant + model + skill.',
        'Live error stream with tenant + request correlation.',
      ]}
    />
  );
}
