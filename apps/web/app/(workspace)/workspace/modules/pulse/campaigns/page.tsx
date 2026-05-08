import {Megaphone} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Campaigns — Pulse'};

export default function PulseCampaignsPage() {
  return (
    <PendingSection
      eyebrow="Pulse · Workspace"
      title="Campaigns"
      description="Outbound operational campaigns — promotions, scheduled outreach and marketing flows orchestrated by Pulse skills."
      icon={<Megaphone size={26} />}
      iconGradient="from-rose-500 to-pink-500"
      glowColor="bg-rose-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Campaign builder: audience, schedule, channels, message templates.',
        'Live counters: sent, delivered, replied, escalated.',
        'Guardrails: opt-out enforcement, rate caps, per-tenant compliance flags.',
      ]}
    />
  );
}
