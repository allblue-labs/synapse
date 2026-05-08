import {Ticket} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Ticket — Pulse'};

interface PageProps {
  params: Promise<{ticketId: string}>;
}

export default async function PulseTicketDetailPage({params}: PageProps) {
  const {ticketId} = await params;

  return (
    <PendingSection
      eyebrow={`Pulse · Ticket ${ticketId}`}
      title="Ticket detail"
      description="The operational view of a single ticket — context, AI decisions, playbook state and human review actions."
      icon={<Ticket size={26} />}
      iconGradient="from-brand-500 to-accent-500"
      glowColor="bg-brand-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Operational timeline with system / AI / customer / operator events.',
        'Extracted context panel (conversation participants, structured fields, confidence).',
        'Workflow state machine + active playbook step indicator.',
        'Human review actions: approve, reject, escalate, attach knowledge, hand off.',
        'Audit-safe operational log for compliance review.',
      ]}
    />
  );
}
