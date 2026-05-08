import { BadRequestException } from '@nestjs/common';

export const PULSE_FLOW_STATES = {
  INTAKE: 'intake',
  CLASSIFY_INTENT: 'classify_intent',
  COLLECT_CONTEXT: 'collect_context',
  WAITING_CUSTOMER: 'waiting_customer',
  EXECUTE_ACTION: 'execute_action',
  REVIEW_REQUIRED: 'review_required',
  OPERATOR_TAKEOVER: 'operator_takeover',
  ESCALATED: 'escalated',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type PulseFlowState = typeof PULSE_FLOW_STATES[keyof typeof PULSE_FLOW_STATES];

export const PULSE_FLOW_STATE_VALUES = Object.values(PULSE_FLOW_STATES);

const START_STATES: ReadonlyArray<PulseFlowState> = [
  PULSE_FLOW_STATES.INTAKE,
  PULSE_FLOW_STATES.CLASSIFY_INTENT,
  PULSE_FLOW_STATES.REVIEW_REQUIRED,
  PULSE_FLOW_STATES.OPERATOR_TAKEOVER,
  PULSE_FLOW_STATES.ESCALATED,
];

const TERMINAL_STATES: ReadonlyArray<PulseFlowState> = [
  PULSE_FLOW_STATES.COMPLETED,
  PULSE_FLOW_STATES.CANCELLED,
];

const TRANSITIONS: Readonly<Record<PulseFlowState, ReadonlyArray<PulseFlowState>>> = {
  intake: [
    PULSE_FLOW_STATES.CLASSIFY_INTENT,
    PULSE_FLOW_STATES.COLLECT_CONTEXT,
    PULSE_FLOW_STATES.REVIEW_REQUIRED,
    PULSE_FLOW_STATES.CANCELLED,
  ],
  classify_intent: [
    PULSE_FLOW_STATES.COLLECT_CONTEXT,
    PULSE_FLOW_STATES.EXECUTE_ACTION,
    PULSE_FLOW_STATES.REVIEW_REQUIRED,
    PULSE_FLOW_STATES.ESCALATED,
    PULSE_FLOW_STATES.CANCELLED,
  ],
  collect_context: [
    PULSE_FLOW_STATES.WAITING_CUSTOMER,
    PULSE_FLOW_STATES.EXECUTE_ACTION,
    PULSE_FLOW_STATES.REVIEW_REQUIRED,
    PULSE_FLOW_STATES.ESCALATED,
    PULSE_FLOW_STATES.CANCELLED,
  ],
  waiting_customer: [
    PULSE_FLOW_STATES.COLLECT_CONTEXT,
    PULSE_FLOW_STATES.EXECUTE_ACTION,
    PULSE_FLOW_STATES.OPERATOR_TAKEOVER,
    PULSE_FLOW_STATES.CANCELLED,
  ],
  execute_action: [
    PULSE_FLOW_STATES.COMPLETED,
    PULSE_FLOW_STATES.REVIEW_REQUIRED,
    PULSE_FLOW_STATES.ESCALATED,
    PULSE_FLOW_STATES.CANCELLED,
  ],
  review_required: [
    PULSE_FLOW_STATES.OPERATOR_TAKEOVER,
    PULSE_FLOW_STATES.COLLECT_CONTEXT,
    PULSE_FLOW_STATES.EXECUTE_ACTION,
    PULSE_FLOW_STATES.ESCALATED,
    PULSE_FLOW_STATES.CANCELLED,
  ],
  operator_takeover: [
    PULSE_FLOW_STATES.COLLECT_CONTEXT,
    PULSE_FLOW_STATES.EXECUTE_ACTION,
    PULSE_FLOW_STATES.COMPLETED,
    PULSE_FLOW_STATES.ESCALATED,
    PULSE_FLOW_STATES.CANCELLED,
  ],
  escalated: [
    PULSE_FLOW_STATES.OPERATOR_TAKEOVER,
    PULSE_FLOW_STATES.COMPLETED,
    PULSE_FLOW_STATES.CANCELLED,
  ],
  completed: [],
  cancelled: [],
};

export function isPulseFlowState(value: unknown): value is PulseFlowState {
  return typeof value === 'string' && PULSE_FLOW_STATE_VALUES.includes(value as PulseFlowState);
}

export function assertPulseFlowTransition(
  previousState: PulseFlowState | null,
  nextState: PulseFlowState,
) {
  if (!previousState) {
    if (!START_STATES.includes(nextState)) {
      throw new BadRequestException(
        `Pulse flow must start at one of: ${START_STATES.join(', ')}.`,
      );
    }
    return;
  }

  if (TERMINAL_STATES.includes(previousState)) {
    throw new BadRequestException(`Cannot advance a terminal Pulse flow from "${previousState}".`);
  }

  const allowed = TRANSITIONS[previousState];
  if (!allowed.includes(nextState)) {
    throw new BadRequestException(
      `Invalid Pulse flow transition from "${previousState}" to "${nextState}".`,
    );
  }
}
