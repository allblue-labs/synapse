import {Flag} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Feature Flags — Platform'};

export default function PlatformFlagsPage() {
  return (
    <PendingSection
      eyebrow="Platform · Control center"
      title="Feature Flags"
      description="Roll features out safely. Per-flag visibility, per-tenant overrides, expiry hints."
      icon={<Flag size={26} />}
      iconGradient="from-indigo-500 to-violet-500"
      glowColor="bg-indigo-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Flag inventory with current rollout state.',
        'Per-tenant overrides + bulk targeting (plan, region).',
        'Audit trail on every change.',
      ]}
    />
  );
}
