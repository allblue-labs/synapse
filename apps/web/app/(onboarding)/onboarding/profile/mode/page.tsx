import {ModeSelectorClient} from '@/components/onboarding/mode-selector-client';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Choose setup mode — Synapse'};

export default function OnboardingModePage() {
  return <ModeSelectorClient />;
}
