import {Workflow} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Playbooks — Pulse'};

export default function PulsePlaybooksPage() {
  return (
    <PendingSection
      eyebrow="Pulse · Workspace"
      title="Playbooks"
      description="Visual guided operational flows — define the steps an AI agent and your team take across a ticket lifecycle."
      icon={<Workflow size={26} />}
      iconGradient="from-amber-500 to-orange-500"
      glowColor="bg-amber-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Visual flow editor: trigger → AI decision → human review → outcome.',
        'Versioning: DRAFT / ACTIVE / ARCHIVED with safe rollouts.',
        'Per-skill playbooks (scheduler, sales, support, knowledge, marketing, operator).',
        'Live preview against historical tickets.',
      ]}
    />
  );
}
