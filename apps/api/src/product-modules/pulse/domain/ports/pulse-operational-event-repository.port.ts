import { Prisma, PulseActorType } from '@prisma/client';

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

export interface IPulseOperationalEventRepository {
  record(input: CreatePulseOperationalEventInput): Promise<{
    id: string;
    tenantId: string;
    eventType: string;
    occurredAt: Date;
  }>;
  listForConversation(tenantId: string, conversationId: string, filter?: {
    page?: number;
    pageSize?: number;
    eventType?: string;
    occurredFrom?: Date;
    occurredTo?: Date;
  }): Promise<{
    data: Array<{
      id: string;
      tenantId: string;
      eventType: string;
      occurredAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>;
  listForTicket(tenantId: string, ticketId: string, filter?: {
    page?: number;
    pageSize?: number;
    eventType?: string;
    occurredFrom?: Date;
    occurredTo?: Date;
  }): Promise<{
    data: Array<{
      id: string;
      tenantId: string;
      eventType: string;
      occurredAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>;
}
