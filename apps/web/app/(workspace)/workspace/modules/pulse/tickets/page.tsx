import {Ticket} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Tickets — Pulse'};

export default function PulseTicketsPage() {
  return (
    <PendingSection
      eyebrow="Pulse · Workspace"
      title="Tickets"
      description="Operational ticket lifecycle — create, track, escalate and resolve work items routed through Pulse."
      icon={<Ticket size={26} />}
      iconGradient="from-brand-500 to-indigo-500"
      glowColor="bg-brand-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Filterable list of tickets across types (support, sales, scheduling, marketing, operator review).',
        'Inline status badges + confidence indicators driven by the AI pipeline.',
        'Bulk actions: assign, escalate, resolve.',
        'Drill-in to /workspace/modules/pulse/tickets/[ticketId] for the full operational timeline.',
      ]}
    />
  );
}
