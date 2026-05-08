import {ScrollText} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Audit — Platform'};

export default function PlatformAuditPage() {
  return (
    <PendingSection
      eyebrow="Platform · Control center"
      title="Audit"
      description="Append-only platform audit ledger — security events, role changes, plan changes, admin actions."
      icon={<ScrollText size={26} />}
      iconGradient="from-indigo-500 to-violet-500"
      glowColor="bg-indigo-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Searchable, filterable AuditEvent stream (action, actor, tenant, status).',
        'Per-tenant scoping plus a "platform-only" view for cross-tenant events.',
        'Hard rule: tenant private data never appears here unless explicitly allowed by the contract.',
      ]}
    />
  );
}
