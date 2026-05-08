import {Activity} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Timeline — Pulse'};

export default function PulseTimelinePage() {
  return (
    <PendingSection
      eyebrow="Pulse · Workspace"
      title="Operational Timeline"
      description="A real-time, tenant-scoped feed of operational events: AI decisions, workflow transitions, escalations and human reviews."
      icon={<Activity size={26} />}
      iconGradient="from-emerald-500 to-teal-500"
      glowColor="bg-emerald-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Event-stream UI with type badges (AI / system / operator / customer).',
        'Filter by ticket, channel, skill, severity, time range.',
        'Confidence overlays for AI events; explainability inline.',
        'Pin / star events for handover.',
      ]}
    />
  );
}
