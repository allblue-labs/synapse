import { PULSE_FLOW_STATES, PulseFlowState } from './pulse-flow-state-machine';

export const PULSE_CONFIDENCE_THRESHOLDS = {
  ESCALATE_BELOW: 0.35,
  REVIEW_BELOW: 0.65,
} as const;

export type PulseConfidenceAction = 'accept' | 'review_required' | 'escalate';

export interface PulseConfidenceDecision {
  action: PulseConfidenceAction;
  requestedState: PulseFlowState;
  effectiveState: PulseFlowState;
  confidence?: number;
  threshold: typeof PULSE_CONFIDENCE_THRESHOLDS;
  reason: string;
}

export function evaluatePulseConfidence(input: {
  requestedState: PulseFlowState;
  confidence?: number;
  transitionSource?: 'manual' | 'system' | 'ai' | 'integration';
}): PulseConfidenceDecision {
  const automated = input.transitionSource === 'ai' || input.transitionSource === 'integration';
  if (!automated || input.confidence === undefined) {
    return {
      action: 'accept',
      requestedState: input.requestedState,
      effectiveState: input.requestedState,
      confidence: input.confidence,
      threshold: PULSE_CONFIDENCE_THRESHOLDS,
      reason: 'confidence_policy_not_applied',
    };
  }

  if (input.confidence < PULSE_CONFIDENCE_THRESHOLDS.ESCALATE_BELOW) {
    return {
      action: 'escalate',
      requestedState: input.requestedState,
      effectiveState: PULSE_FLOW_STATES.ESCALATED,
      confidence: input.confidence,
      threshold: PULSE_CONFIDENCE_THRESHOLDS,
      reason: 'confidence_below_escalation_threshold',
    };
  }

  if (input.confidence < PULSE_CONFIDENCE_THRESHOLDS.REVIEW_BELOW) {
    return {
      action: 'review_required',
      requestedState: input.requestedState,
      effectiveState: PULSE_FLOW_STATES.REVIEW_REQUIRED,
      confidence: input.confidence,
      threshold: PULSE_CONFIDENCE_THRESHOLDS,
      reason: 'confidence_below_review_threshold',
    };
  }

  return {
    action: 'accept',
    requestedState: input.requestedState,
    effectiveState: input.requestedState,
    confidence: input.confidence,
    threshold: PULSE_CONFIDENCE_THRESHOLDS,
    reason: 'confidence_accepted',
  };
}
