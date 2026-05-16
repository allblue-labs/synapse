import {redirect} from 'next/navigation';
import {loadStatus} from '@/lib/onboarding/loaders';
import {ProfileIntroClient} from '@/components/onboarding/intro-client';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Workspace setup — Synapse'};

/**
 * Step 1 — Introduction.
 *
 *   - Server-side checks: if the tenant already has an approved profile,
 *     the operator is redirected to the workspace. The onboarding flow
 *     is fire-once per tenant.
 *   - Otherwise the intro screen renders; the CTA on the client routes
 *     to the mode selector.
 */

export default async function OnboardingIntroPage() {
  const result = await loadStatus();

  if (result.kind === 'ok' && result.data.status === 'APPROVED') {
    redirect('/workspace/overview');
  }

  // Decide where the CTA should land based on existing draft state.
  let resumePath = '/onboarding/profile/mode';
  if (result.kind === 'ok' && result.data.draft) {
    const mode = result.data.draft.mode;
    if (result.data.status === 'AWAITING_VALIDATION') {
      resumePath = '/onboarding/profile/validation';
    } else if (mode === 'LLM') {
      resumePath = `/onboarding/profile/session/${result.data.draft.id}`;
    } else if (mode === 'MANUAL_FORM') {
      resumePath = '/onboarding/profile/manual';
    }
  }

  return <ProfileIntroClient resumePath={resumePath} />;
}
