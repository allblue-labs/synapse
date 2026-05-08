import {CreditCard} from 'lucide-react';
import {PendingSection} from '@/components/ui/pending-section';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Billing — Platform'};

export default function PlatformBillingPage() {
  return (
    <PendingSection
      eyebrow="Platform · Control center"
      title="Billing"
      description="Platform-level billing pipeline — subscriptions, invoices, Stripe webhook health, usage rating."
      icon={<CreditCard size={26} />}
      iconGradient="from-indigo-500 to-violet-500"
      glowColor="bg-indigo-500/15"
      trackingTag="Stage 1B"
      whatsComing={[
        'Subscription health by tenant: TRIALING / ACTIVE / PAST_DUE / CANCELED.',
        'Invoice ledger with link-out to Stripe.',
        'Stripe meter mappings + reporting status (SENT / FAILED / SKIPPED).',
        'Webhook event ledger (PROCESSED / IGNORED / FAILED) with retry actions.',
      ]}
    />
  );
}
