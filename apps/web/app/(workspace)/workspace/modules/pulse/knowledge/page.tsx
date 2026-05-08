import {BookOpen} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Knowledge — Pulse'};

export default function PulseKnowledgePage() {
  return (
    <PendingSection
      eyebrow="Pulse · Workspace"
      title="Knowledge"
      description="Operational context the AI uses to answer customers — FAQs, business descriptions, operational instructions, products and services."
      icon={<BookOpen size={26} />}
      iconGradient="from-sky-500 to-cyan-500"
      glowColor="bg-sky-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Typed knowledge contexts: FAQ, business description, operational instruction, product/service, campaign/promotion.',
        'Inline editor with versioning and freshness signals.',
        'Search + retrieval preview to validate what the AI sees at runtime.',
      ]}
    />
  );
}
