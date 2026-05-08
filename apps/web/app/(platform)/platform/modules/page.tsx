import {Layers} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Modules — Platform'};

export default function PlatformModulesPage() {
  return (
    <PendingSection
      eyebrow="Platform · Control center"
      title="Module Catalog"
      description="Manage the platform-wide module catalog — pricing, visibility, plan compatibility, rollout state."
      icon={<Layers size={26} />}
      iconGradient="from-indigo-500 to-violet-500"
      glowColor="bg-indigo-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Module list with rollout state (DRAFT / PILOT / GA / DEPRECATED).',
        'Tier configuration (FREE / LIGHT / PRO / PREMIUM) and per-plan compatibility.',
        'Visibility (PUBLIC / PRIVATE / HIDDEN) and tenant-scoped overrides.',
        'Enable / disable per tenant or platform-wide.',
      ]}
    />
  );
}
