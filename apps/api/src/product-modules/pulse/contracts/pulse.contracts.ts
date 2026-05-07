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
