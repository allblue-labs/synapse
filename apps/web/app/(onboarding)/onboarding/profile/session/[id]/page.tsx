import {redirect} from 'next/navigation';
import {loadStatus} from '@/lib/onboarding/loaders';
import {InterviewClient} from '@/components/onboarding/interview-client';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Interview — Synapse setup'};

interface PageProps {
  params: Promise<{id: string}>;
}

export default async function OnboardingSessionPage({params}: PageProps) {
  const {id} = await params;
  const result = await loadStatus();

  // Approved already → out of onboarding entirely.
  if (result.kind === 'ok' && result.data.status === 'APPROVED') {
    redirect('/workspace/overview');
  }

  // Profile already past interview → jump straight to validation.
  if (result.kind === 'ok' && result.data.status === 'AWAITING_VALIDATION') {
    redirect('/onboarding/profile/validation');
  }

  const initialAnswers = result.kind === 'ok' ? (result.data.draft?.answers ?? {}) : {};
  const initialNextQuestion = result.kind === 'ok' ? (result.data.draft?.nextQuestion ?? null) : null;

  return (
    <InterviewClient
      sessionId={id}
      initialAnswers={initialAnswers}
      initialNextQuestion={initialNextQuestion}
    />
  );
}
