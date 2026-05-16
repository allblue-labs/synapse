import {redirect} from 'next/navigation';
import {loadStatus} from '@/lib/onboarding/loaders';
import {ManualFormClient} from '@/components/onboarding/manual-form-client';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Manual setup — Synapse'};

export default async function OnboardingManualPage() {
  const result = await loadStatus();

  if (result.kind === 'ok' && result.data.status === 'APPROVED') {
    redirect('/workspace/overview');
  }
  if (result.kind === 'ok' && result.data.status === 'AWAITING_VALIDATION') {
    redirect('/onboarding/profile/validation');
  }

  const initialAnswers = result.kind === 'ok' ? (result.data.draft?.answers ?? {}) : {};

  return <ManualFormClient initialAnswers={initialAnswers} />;
}
