import {redirect} from 'next/navigation';
import {loadStatus} from '@/lib/onboarding/loaders';
import {ValidationClient} from '@/components/onboarding/validation-client';
import {api} from '@/lib/api';
import type {Metadata} from 'next';
import type {TenantProfileSummary} from '@/lib/api';

export const metadata: Metadata = {title: 'Review profile — Synapse setup'};

export default async function OnboardingValidationPage() {
  const result = await loadStatus();

  if (result.kind === 'ok' && result.data.status === 'APPROVED') {
    redirect('/workspace/overview');
  }

  // Best-effort: generate the latest summary on this render so the page
  // always shows the freshest read of the operator's draft. If the call
  // fails we fall back to whatever the status payload returned.
  let summary: TenantProfileSummary | null = null;
  try {
    summary = await api.tenantContext.generateSummary();
  } catch {
    summary = null;
  }

  const fallback = result.kind === 'ok' ? result.data.latestSummary : null;

  return (
    <ValidationClient
      summary={summary}
      fallback={fallback ?? null}
      initialAnswers={result.kind === 'ok' ? (result.data.draft?.answers ?? {}) : {}}
    />
  );
}
