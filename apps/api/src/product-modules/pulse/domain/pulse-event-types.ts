export const PULSE_EVENT_TYPES = {
  CONVERSATION_LINKED: 'pulse.conversation.linked',
  CONVERSATION_RESOLVED: 'pulse.conversation.resolved',
  ENTRY_RECEIVED: 'pulse.entry.received',
  ENTRY_VALIDATED: 'pulse.entry.validated',
  ENTRY_REJECTED: 'pulse.entry.rejected',
  ENTRY_RETRY_REQUESTED: 'pulse.entry.retry_requested',
  TICKET_CREATED: 'pulse.ticket.created',
  TICKET_ASSIGN: 'pulse.ticket.assign_ticket',
  TICKET_RESOLVE: 'pulse.ticket.resolve_ticket',
  TICKET_REOPEN: 'pulse.ticket.reopen_ticket',
  TICKET_ESCALATE: 'pulse.ticket.escalate_ticket',
  TICKET_CANCEL: 'pulse.ticket.cancel_ticket',
  TICKET_OPERATOR_REVIEW: 'pulse.ticket.submit_operator_review',
  TICKET_FLOW_ADVANCE: 'pulse.ticket.advance_flow_state',
  KNOWLEDGE_PUBLISHED: 'pulse.knowledge.published',
  KNOWLEDGE_ARCHIVED: 'pulse.knowledge.archived',
  CONTEXT_ASSEMBLED: 'pulse.context.assembled',
  RUNTIME_EXECUTION_REQUESTED: 'pulse.runtime.execution_requested',
  RUNTIME_EXECUTION_DISPATCHED: 'pulse.runtime.execution_dispatched',
  RUNTIME_EXECUTION_DISPATCH_COMPLETED: 'pulse.runtime.execution_dispatch_completed',
  RUNTIME_EXECUTION_DISPATCH_SKIPPED: 'pulse.runtime.execution_dispatch_skipped',
  RUNTIME_EXECUTION_DISPATCH_FAILED: 'pulse.runtime.execution_dispatch_failed',
  RUNTIME_EXECUTION_RESULT_INGESTED: 'pulse.runtime.execution_result_ingested',
  RUNTIME_ACTION_PLANNED: 'pulse.runtime.action_planned',
  ACTION_DISPATCHED: 'pulse.action.dispatched',
  ACTION_COMPLETED: 'pulse.action.completed',
  ACTION_SKIPPED: 'pulse.action.skipped',
  ACTION_FAILED: 'pulse.action.failed',
  CONTEXT_ASSEMBLY_FAILED: 'pulse.context.assembly_failed',
  UNSUPPORTED_MESSAGE_TYPE: 'pulse.unsupported_message_type',
  FLOW_TRANSITIONED: 'pulse.flow.transitioned',
} as const;

export type PulseEventType = typeof PULSE_EVENT_TYPES[keyof typeof PULSE_EVENT_TYPES];

export const PULSE_EVENT_TYPE_VALUES = Object.values(PULSE_EVENT_TYPES);

export type PulseTimelineCategory =
  | 'entry'
  | 'ticket_lifecycle'
  | 'operator_action'
  | 'escalation'
  | 'confidence'
  | 'workflow_state';

export const PULSE_TIMELINE_CATEGORY_EVENT_TYPES: Readonly<Record<PulseTimelineCategory, ReadonlyArray<PulseEventType>>> = {
  entry: [
    PULSE_EVENT_TYPES.ENTRY_RECEIVED,
    PULSE_EVENT_TYPES.ENTRY_VALIDATED,
    PULSE_EVENT_TYPES.ENTRY_REJECTED,
    PULSE_EVENT_TYPES.ENTRY_RETRY_REQUESTED,
  ],
  ticket_lifecycle: [
    PULSE_EVENT_TYPES.TICKET_CREATED,
    PULSE_EVENT_TYPES.TICKET_ASSIGN,
    PULSE_EVENT_TYPES.TICKET_RESOLVE,
    PULSE_EVENT_TYPES.TICKET_REOPEN,
    PULSE_EVENT_TYPES.TICKET_ESCALATE,
    PULSE_EVENT_TYPES.TICKET_CANCEL,
    PULSE_EVENT_TYPES.TICKET_OPERATOR_REVIEW,
    PULSE_EVENT_TYPES.TICKET_FLOW_ADVANCE,
  ],
  operator_action: [
    PULSE_EVENT_TYPES.TICKET_ASSIGN,
    PULSE_EVENT_TYPES.TICKET_RESOLVE,
    PULSE_EVENT_TYPES.TICKET_REOPEN,
    PULSE_EVENT_TYPES.TICKET_ESCALATE,
    PULSE_EVENT_TYPES.TICKET_CANCEL,
    PULSE_EVENT_TYPES.TICKET_OPERATOR_REVIEW,
    PULSE_EVENT_TYPES.TICKET_FLOW_ADVANCE,
  ],
  escalation: [
    PULSE_EVENT_TYPES.TICKET_ESCALATE,
  ],
  confidence: [
    PULSE_EVENT_TYPES.ENTRY_VALIDATED,
    PULSE_EVENT_TYPES.TICKET_OPERATOR_REVIEW,
    PULSE_EVENT_TYPES.TICKET_FLOW_ADVANCE,
  ],
  workflow_state: [
    PULSE_EVENT_TYPES.TICKET_FLOW_ADVANCE,
    PULSE_EVENT_TYPES.FLOW_TRANSITIONED,
  ],
};

export const PULSE_TIMELINE_CATEGORY_VALUES = Object.keys(
  PULSE_TIMELINE_CATEGORY_EVENT_TYPES,
) as PulseTimelineCategory[];

export function pulseEventTypesForCategory(category?: PulseTimelineCategory) {
  return category ? PULSE_TIMELINE_CATEGORY_EVENT_TYPES[category] : undefined;
}
