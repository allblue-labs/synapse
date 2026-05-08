import { evaluatePulseConfidence } from './pulse-confidence-policy';

describe('evaluatePulseConfidence', () => {
  it('accepts manual transitions without policy rerouting', () => {
    expect(
      evaluatePulseConfidence({
        requestedState: 'execute_action',
        transitionSource: 'manual',
        confidence: 0.12,
      }),
    ).toEqual(
      expect.objectContaining({
        action: 'accept',
        effectiveState: 'execute_action',
        reason: 'confidence_policy_not_applied',
      }),
    );
  });

  it('routes low-confidence automated transitions to review', () => {
    expect(
      evaluatePulseConfidence({
        requestedState: 'execute_action',
        transitionSource: 'ai',
        confidence: 0.5,
      }),
    ).toEqual(
      expect.objectContaining({
        action: 'review_required',
        effectiveState: 'review_required',
        reason: 'confidence_below_review_threshold',
      }),
    );
  });

  it('routes very low-confidence automated transitions to escalation', () => {
    expect(
      evaluatePulseConfidence({
        requestedState: 'execute_action',
        transitionSource: 'integration',
        confidence: 0.2,
      }),
    ).toEqual(
      expect.objectContaining({
        action: 'escalate',
        effectiveState: 'escalated',
        reason: 'confidence_below_escalation_threshold',
      }),
    );
  });
});
