import {Plug} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Integrations — Platform'};

export default function PlatformIntegrationsPage() {
  return (
    <PendingSection
      eyebrow="Platform · Control center"
      title="Integrations Health"
      description="Status of every external system Synapse depends on — Stripe, OpenAI, Telegram, calendar providers."
      icon={<Plug size={26} />}
      iconGradient="from-indigo-500 to-violet-500"
      glowColor="bg-indigo-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Per-provider health: latency, error rate, last successful call.',
        'Webhook delivery status (Stripe events) with retry visibility.',
        'Tenant-scoped credential health for OAuth integrations.',
      ]}
    />
  );
}
