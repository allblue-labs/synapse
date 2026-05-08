import {Plug} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Integrations — Pulse'};

export default function PulseIntegrationsPage() {
  return (
    <PendingSection
      eyebrow="Pulse · Workspace"
      title="Integrations"
      description="External systems Pulse plugs into to take operational actions: calendars, CRMs, scheduling providers and more."
      icon={<Plug size={26} />}
      iconGradient="from-blue-500 to-cyan-500"
      glowColor="bg-blue-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Connection cards for Google Calendar, Outlook, Calendly (initial set).',
        'Per-integration health status (active / disconnected / needs attention).',
        'OAuth flows + per-tenant credential isolation.',
      ]}
    />
  );
}
