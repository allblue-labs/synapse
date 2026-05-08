import {BarChart3} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Metrics — Pulse'};

export default function PulseMetricsPage() {
  return (
    <PendingSection
      eyebrow="Pulse · Workspace"
      title="Metrics"
      description="Operational metrics for the Pulse module — conversation volume, resolution rate, escalations, response time and AI usage."
      icon={<BarChart3 size={26} />}
      iconGradient="from-emerald-500 to-green-500"
      glowColor="bg-emerald-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Headline counters: conversations, resolutions, escalations, average confidence.',
        'Time-bucketed charts (24h / 7d / 30d / 90d) without becoming a generic dashboard.',
        'AI usage breakdown by skill and model.',
        'Drill from any metric directly into the underlying tickets.',
      ]}
    />
  );
}
