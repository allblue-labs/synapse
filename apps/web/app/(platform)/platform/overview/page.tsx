import {Activity} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Platform Overview'};

export default function PlatformOverviewPage() {
  return (
    <PendingSection
      eyebrow="Platform · Control center"
      title="Platform Overview"
      description="Operational observability for the Synapse platform — tenant health, runtime status, queue depth, billing pipeline."
      icon={<Activity size={26} />}
      iconGradient="from-indigo-500 to-violet-500"
      glowColor="bg-indigo-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Tenant counters: active, suspended, pending setup.',
        'Runtime view: queue depth, worker health, error rate.',
        'Billing pipeline: subscriptions, invoices, Stripe webhook lag.',
        'Direct drill-in to /platform/tenants, /platform/modules, /platform/runtime.',
      ]}
    />
  );
}
