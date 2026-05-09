export interface PulseExtractedData {
  procedure?: string;
  date?: string;
  time?: string;
  patientName?: string;
  notes?: string;
}

export interface PulseLog {
  at: string;
  stage: string;
  message: string;
}

export type PulseActorType =
  | 'SYSTEM'
  | 'USER'
  | 'CUSTOMER'
  | 'AI'
  | 'INTEGRATION';

export interface ProcessPulseJob {
  tenantId: string;
  entryId: string;
}

export interface AiExtractionResult {
  extractedData: PulseExtractedData;
  confidence: number;
  summary: string;
}

export interface TranscriptionResult {
  text: string;
  durationSeconds?: number;
}

export type PulseUnsupportedMessageType =
  | 'image'
  | 'video'
  | 'sticker'
  | 'contact'
  | 'document';

export interface PulseFlowTransition {
  fromState: string;
  toState: string;
  confidence?: number;
  threshold?: number;
  reason?: string;
}

export interface PulseExecutionContext {
  tenantId: string;
  moduleSlug: 'pulse';
  actorUserId?: string;
  conversationId?: string;
  ticketId?: string;
  requestId?: string;
}

export interface PulseSchedulingProviderPort {
  provider: 'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR' | 'CALENDLY';
  findAvailability(input: {
    tenantId: string;
    integrationId: string;
    windowStart: Date;
    windowEnd: Date;
    durationMinutes: number;
    timezone: string;
  }): Promise<Array<{ startsAt: Date; endsAt: Date; providerRef?: string }>>;
  book(input: {
    tenantId: string;
    integrationId: string;
    startsAt: Date;
    durationMinutes: number;
    participant: { name?: string; email?: string; phone?: string };
  }): Promise<{ bookingId: string; providerRef?: string; status: 'CONFIRMED' | 'PENDING' | 'FAILED' }>;
}

export const PULSE_CONTEXT_PACK_VERSION = 'pulse.context-pack.v1' as const;

export type PulseContextExecutionType =
  | 'classify_intent'
  | 'extract_operational_state'
  | 'advance_flow'
  | 'operator_review'
  | 'knowledge_answer'
  | 'schedule_action'
  | 'marketing_action';

export type PulseContextSkill =
  | 'SCHEDULER'
  | 'SALES'
  | 'SUPPORT'
  | 'KNOWLEDGE'
  | 'MARKETING'
  | 'OPERATOR';

export interface PulseContextAssemblyInput {
  tenantId: string;
  workspaceId?: string;
  skill: PulseContextSkill;
  executionType: PulseContextExecutionType;
  conversationId?: string;
  ticketId?: string;
  playbookKey?: string;
  knowledgeLimit?: number;
}

export interface PulseContextPack {
  version: typeof PULSE_CONTEXT_PACK_VERSION;
  tenantId: string;
  workspaceId: string;
  module: 'pulse';
  skill: PulseContextSkill;
  executionType: PulseContextExecutionType;
  conversationState: Record<string, unknown> | null;
  ticketState: Record<string, unknown> | null;
  playbookState: Record<string, unknown> | null;
  knowledgeSnippets: Array<Record<string, unknown>>;
  productsOrServices: Array<Record<string, unknown>>;
  campaignContext: Array<Record<string, unknown>>;
  schedulingContext: Record<string, unknown>;
  allowedActions: string[];
  requiredOutputSchema: Record<string, unknown>;
  securityHints: string[];
  usageHints: Record<string, unknown>;
  assembledAt: string;
}
