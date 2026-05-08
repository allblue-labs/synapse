import {Building2} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Tenants — Platform'};

export default function PlatformTenantsPage() {
  return (
    <PendingSection
      eyebrow="Platform · Control center"
      title="Tenants"
      description="Manage tenants across the platform — status, plan, owners, modules enabled."
      icon={<Building2 size={26} />}
      iconGradient="from-indigo-500 to-violet-500"
      glowColor="bg-indigo-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Tenant list with status filters (active / suspended / pending setup).',
        'Owner identity, plan tier, module entitlements.',
        'Suspend / restore actions with audit trails.',
        'Drill-in to per-tenant operational metrics — never tenant private data.',
      ]}
    />
  );
}
