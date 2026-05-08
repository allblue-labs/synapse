import {Boxes} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Catalog — Pulse'};

export default function PulseCatalogPage() {
  return (
    <PendingSection
      eyebrow="Pulse · Workspace"
      title="Catalog"
      description="Products and services Pulse can quote, recommend and sell — used by sales/support skills and surfaced inside customer conversations."
      icon={<Boxes size={26} />}
      iconGradient="from-violet-500 to-purple-500"
      glowColor="bg-violet-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Catalog browser with categories, pricing, availability and rich descriptions.',
        'AI-friendly attributes that drive recommendations.',
        'Sync with external sources (CSV import, future: Shopify / catalog APIs).',
      ]}
    />
  );
}
