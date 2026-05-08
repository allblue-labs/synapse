import { Prisma, PulseActorType } from '@prisma/client';
import { PulseEventType } from '../pulse-event-types';

export const PULSE_OPERATIONAL_EVENT_REPOSITORY = Symbol('PULSE_OPERATIONAL_EVENT_REPOSITORY');

export interface CreatePulseOperationalEventInput {
  tenantId: string;
  eventType: string;
  actorType?: PulseActorType;
  actorUserId?: string;
  channelId?: string;
  conversationId?: string;
  ticketId?: string;
  payload?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  occurredAt?: Date;
}

export interface PulseOperationalTimelineFilter {
  page?: number;
  pageSize?: number;
  eventType?: PulseEventType | string;
  eventTypes?: ReadonlyArray<PulseEventType | string>;
  occurredFrom?: Date;
  occurredTo?: Date;
}

export interface PulseOperationalTimelineRecord {
  id: string;
  tenantId: string;
  eventType: string;
  actorType: PulseActorType;
  actorUserId: string | null;
  channelId: string | null;
  conversationId: string | null;
  ticketId: string | null;
  payload: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  occurredAt: Date;
}

export interface IPulseOperationalEventRepository {
  record(input: CreatePulseOperationalEventInput): Promise<{
    id: string;
    tenantId: string;
    eventType: string;
    occurredAt: Date;
  }>;
  listForConversation(tenantId: string, conversationId: string, filter?: PulseOperationalTimelineFilter): Promise<{
    data: PulseOperationalTimelineRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  listForTicket(tenantId: string, ticketId: string, filter?: PulseOperationalTimelineFilter): Promise<{
    data: PulseOperationalTimelineRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
