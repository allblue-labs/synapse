/**
 * Pulse — typed mock fixtures.
 *
 * Single integration seam. Every Stage 1B Pulse screen calls one of
 * the `loadX(...)` helpers below. When the matching backend DTO ships
 * (Stage 1C), each helper becomes a one-liner against `api.pulse.*` —
 * no callers change.
 *
 *   loadInboxTickets(filter)   → server-side fetch, paginated
 *   loadTicketDetail(id)       → server-side fetch with timeline
 *
 * Until then these return stable, well-shaped data so screens can be
 * built and reviewed without a running backend.
 */

import type {PulseTicketDetail, PulseTicketRow} from './types';

// ─── Static mock dataset ──────────────────────────────────────────────

const NOW = '2026-05-08T14:00:00.000Z';
const minutesAgo = (n: number): string => new Date(new Date(NOW).getTime() - n * 60_000).toISOString();
const hoursAgo   = (n: number): string => new Date(new Date(NOW).getTime() - n * 60 * 60_000).toISOString();

const TICKETS: ReadonlyArray<PulseTicketDetail> = [
  {
    id: 'tkt_8a4f',
    type: 'SCHEDULING',
    status: 'PENDING_REVIEW',
    priority: 'HIGH',
    skill: 'SCHEDULER',
    confidence: 0.62,
    customer: {handle: '+55 11 99999-0001', displayName: 'Maria Silva', channel: 'WHATSAPP'},
    extracted: {
      intent: 'schedule_appointment',
      fields: [
        {label: 'Day',         value: 'Thursday'},
        {label: 'Period',      value: 'afternoon'},
        {label: 'Provider',    value: 'Dr. Ana Costa'},
        {label: 'Procedure',   value: 'Initial consultation'},
      ],
    },
    workflow: {
      state: 'WAITING_OPERATOR',
      playbookStep: {
        playbookName: 'Scheduling — clinic default',
        stepIndex: 3,
        stepCount: 5,
        stepLabel: 'Confirm slot with operator',
      },
    },
    aiSummary:
      'Customer wants a Thursday afternoon appointment. Two slots available (2:00 PM, 4:30 PM). Confidence is below the auto-approve threshold because the customer mentioned a specific provider — operator confirmation requested.',
    reviewRationale:
      'Confidence below auto-approve threshold (0.62 < 0.75). Provider preference flagged ("Dr. Ana Costa") — verify availability before confirming.',
    timeline: [
      {
        id: 'evt_001',
        kind: 'ticket.opened',
        actor: {type: 'SYSTEM', label: 'Pulse'},
        summary: 'Ticket opened from inbound WhatsApp message.',
        occurredAt: minutesAgo(18),
      },
      {
        id: 'evt_002',
        kind: 'message.inbound',
        actor: {type: 'CUSTOMER', label: 'Maria Silva'},
        summary: 'Hi, I’d like to schedule an appointment with Dr. Ana Costa for Thursday afternoon.',
        occurredAt: minutesAgo(18),
      },
      {
        id: 'evt_003',
        kind: 'ai.extracted',
        actor: {type: 'AI', label: 'gpt-4.1-mini · Scheduler'},
        summary: 'Extracted scheduling intent + 4 structured fields from the message.',
        confidence: 0.62,
        payload: {
          intent: 'schedule_appointment',
          day: 'Thursday',
          period: 'afternoon',
          provider: 'Dr. Ana Costa',
        },
        occurredAt: minutesAgo(18),
      },
      {
        id: 'evt_004',
        kind: 'skill.routed',
        actor: {type: 'SYSTEM', label: 'Pulse · Router'},
        summary: 'Routed to Scheduler skill (top-1 confidence 0.91).',
        confidence: 0.91,
        occurredAt: minutesAgo(18),
      },
      {
        id: 'evt_005',
        kind: 'playbook.step',
        actor: {type: 'SYSTEM', label: 'Playbook · Scheduling'},
        summary: 'Step 2 — propose available slots.',
        occurredAt: minutesAgo(17),
      },
      {
        id: 'evt_006',
        kind: 'message.outbound',
        actor: {type: 'AI', label: 'gpt-4.1-mini · Scheduler'},
        summary:
          'I have Thursday at 2:00 PM or 4:30 PM available with Dr. Ana Costa. Which time works best for you?',
        occurredAt: minutesAgo(17),
      },
      {
        id: 'evt_007',
        kind: 'ai.decision',
        actor: {type: 'AI', label: 'Pulse · Operator Router'},
        summary: 'Confidence below 0.75 with a provider preference — handing off to a human operator.',
        confidence: 0.62,
        occurredAt: minutesAgo(16),
      },
      {
        id: 'evt_008',
        kind: 'status.changed',
        actor: {type: 'SYSTEM', label: 'Pulse'},
        summary: 'Status changed: OPEN → PENDING_REVIEW.',
        occurredAt: minutesAgo(16),
      },
    ],
    createdAt: minutesAgo(18),
    updatedAt: minutesAgo(16),
    capabilities: {
      canApprove: true,
      canReject: true,
      canEscalate: true,
      canResolve: false,
      canReopen: false,
    },
  },

  {
    id: 'tkt_5c2e',
    type: 'SUPPORT',
    status: 'OPEN',
    priority: 'NORMAL',
    skill: 'SUPPORT',
    confidence: 0.91,
    customer: {handle: '+55 21 98877-0042', displayName: 'João Pereira', channel: 'WHATSAPP'},
    extracted: {
      intent: 'order_status',
      fields: [
        {label: 'Order id', value: 'ORD-44213'},
        {label: 'Type',     value: 'shipping_inquiry'},
      ],
    },
    workflow: {state: 'IN_FLOW'},
    aiSummary: 'Customer asking about order ORD-44213 shipping status. AI looked it up and confirmed dispatched yesterday.',
    timeline: [
      {
        id: 'evt_101',
        kind: 'ticket.opened',
        actor: {type: 'SYSTEM', label: 'Pulse'},
        summary: 'Ticket opened from inbound WhatsApp message.',
        occurredAt: minutesAgo(45),
      },
      {
        id: 'evt_102',
        kind: 'ai.decision',
        actor: {type: 'AI', label: 'gpt-4.1-mini · Support'},
        summary: 'High confidence — auto-resolving via integration lookup.',
        confidence: 0.91,
        occurredAt: minutesAgo(44),
      },
      {
        id: 'evt_103',
        kind: 'integration.action',
        actor: {type: 'INTEGRATION', label: 'Shopify · order_lookup'},
        summary: 'Order ORD-44213 found — dispatched 2026-05-07, ETA 2026-05-09.',
        occurredAt: minutesAgo(44),
      },
      {
        id: 'evt_104',
        kind: 'message.outbound',
        actor: {type: 'AI', label: 'gpt-4.1-mini · Support'},
        summary: 'Your order shipped yesterday and is expected to arrive tomorrow.',
        occurredAt: minutesAgo(43),
      },
    ],
    createdAt: minutesAgo(45),
    updatedAt: minutesAgo(43),
    capabilities: {
      canApprove: false,
      canReject: false,
      canEscalate: true,
      canResolve: true,
      canReopen: false,
    },
  },

  {
    id: 'tkt_3b91',
    type: 'OPERATOR_REVIEW',
    status: 'PENDING_REVIEW',
    priority: 'URGENT',
    skill: 'OPERATOR',
    confidence: 0.41,
    customer: {handle: '+55 31 97777-0099', displayName: undefined, channel: 'TELEGRAM'},
    extracted: {
      intent: 'unknown',
      fields: [],
    },
    workflow: {state: 'WAITING_OPERATOR'},
    aiSummary: 'Audio message — transcription quality low (0.41). Could not classify intent confidently.',
    reviewRationale: 'Audio transcription confidence 0.41 — manual review required to avoid auto-mis-routing.',
    timeline: [
      {
        id: 'evt_201',
        kind: 'ticket.opened',
        actor: {type: 'SYSTEM', label: 'Pulse'},
        summary: 'Ticket opened from inbound Telegram audio message.',
        occurredAt: hoursAgo(2),
      },
      {
        id: 'evt_202',
        kind: 'ai.decision',
        actor: {type: 'AI', label: 'whisper-1 · Transcription'},
        summary: 'Low transcription confidence (0.41) — escalating without auto-classification.',
        confidence: 0.41,
        occurredAt: hoursAgo(2),
      },
    ],
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
    capabilities: {
      canApprove: false,
      canReject: true,
      canEscalate: false,
      canResolve: false,
      canReopen: false,
    },
  },

  {
    id: 'tkt_99f0',
    type: 'SALES',
    status: 'WAITING_CUSTOMER',
    priority: 'LOW',
    skill: 'SALES',
    confidence: 0.84,
    customer: {handle: '@anabeatriz', displayName: 'Ana Beatriz', channel: 'TELEGRAM'},
    extracted: {
      intent: 'pricing_inquiry',
      fields: [
        {label: 'Plan interest', value: 'Pro'},
        {label: 'Team size',     value: '12'},
      ],
    },
    workflow: {state: 'WAITING_CUSTOMER'},
    aiSummary: 'Inbound pricing question for Pro plan, team of 12. Sent the pricing page link, awaiting reply.',
    timeline: [
      {
        id: 'evt_301',
        kind: 'ticket.opened',
        actor: {type: 'SYSTEM', label: 'Pulse'},
        summary: 'Ticket opened from inbound Telegram message.',
        occurredAt: hoursAgo(5),
      },
      {
        id: 'evt_302',
        kind: 'message.outbound',
        actor: {type: 'AI', label: 'gpt-4.1-mini · Sales'},
        summary: 'Sent pricing page link and follow-up question on use case.',
        occurredAt: hoursAgo(5),
      },
    ],
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(5),
    capabilities: {
      canApprove: false,
      canReject: false,
      canEscalate: true,
      canResolve: true,
      canReopen: false,
    },
  },

  {
    id: 'tkt_4d12',
    type: 'SUPPORT',
    status: 'RESOLVED',
    priority: 'NORMAL',
    skill: 'SUPPORT',
    confidence: 0.93,
    customer: {handle: '+55 11 95555-1212', displayName: 'Pedro Almeida', channel: 'WHATSAPP'},
    extracted: {
      intent: 'reset_password',
      fields: [{label: 'Account', value: 'pedro@northstar.com'}],
    },
    workflow: {state: 'RESOLVED'},
    aiSummary: 'Password reset link issued via integration. Customer confirmed reset successful.',
    timeline: [
      {
        id: 'evt_401',
        kind: 'ticket.opened',
        actor: {type: 'SYSTEM', label: 'Pulse'},
        summary: 'Ticket opened.',
        occurredAt: hoursAgo(8),
      },
      {
        id: 'evt_402',
        kind: 'integration.action',
        actor: {type: 'INTEGRATION', label: 'Auth · password_reset'},
        summary: 'Reset link sent to pedro@northstar.com.',
        occurredAt: hoursAgo(8),
      },
      {
        id: 'evt_403',
        kind: 'status.changed',
        actor: {type: 'SYSTEM', label: 'Pulse'},
        summary: 'Status changed: OPEN → RESOLVED.',
        occurredAt: hoursAgo(7),
      },
    ],
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(7),
    capabilities: {
      canApprove: false,
      canReject: false,
      canEscalate: false,
      canResolve: false,
      canReopen: true,
    },
  },
];

// ─── Public loaders ───────────────────────────────────────────────────

export interface InboxFilter {
  status?: 'all' | 'needs_review' | 'open' | 'waiting_customer' | 'resolved';
  skill?: 'all' | PulseTicketDetail['skill'];
  priority?: 'all' | 'urgent' | 'high';
}

export async function loadInboxTickets(filter: InboxFilter = {}): Promise<ReadonlyArray<PulseTicketRow>> {
  return TICKETS.filter((t) => {
    if (filter.status === 'needs_review' && t.status !== 'PENDING_REVIEW') return false;
    if (filter.status === 'open' && t.status !== 'OPEN') return false;
    if (filter.status === 'waiting_customer' && t.status !== 'WAITING_CUSTOMER') return false;
    if (filter.status === 'resolved' && t.status !== 'RESOLVED') return false;
    if (filter.skill && filter.skill !== 'all' && t.skill !== filter.skill) return false;
    if (filter.priority === 'urgent' && t.priority !== 'URGENT') return false;
    if (filter.priority === 'high' && t.priority !== 'HIGH' && t.priority !== 'URGENT') return false;
    return true;
  }).map(toRow);
}

export async function loadTicketDetail(id: string): Promise<PulseTicketDetail | null> {
  return TICKETS.find((t) => t.id === id) ?? null;
}

export async function loadAllTickets(): Promise<ReadonlyArray<PulseTicketRow>> {
  return TICKETS.map(toRow);
}

function toRow(t: PulseTicketDetail): PulseTicketRow {
  return {
    id: t.id,
    type: t.type,
    status: t.status,
    priority: t.priority,
    skill: t.skill,
    confidence: t.confidence,
    customer: t.customer,
    preview: t.aiSummary ?? t.extracted.intent ?? '—',
    needsReview: t.status === 'PENDING_REVIEW',
    escalated: t.priority === 'URGENT' && t.status === 'PENDING_REVIEW',
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
