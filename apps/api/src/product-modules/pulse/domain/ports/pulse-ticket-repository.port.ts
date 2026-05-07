import { Prisma, PulseTicketStatus, PulseTicketType } from '@prisma/client';

export const PULSE_TICKET_REPOSITORY = Symbol('PULSE_TICKET_REPOSITORY');

export interface CreatePulseTicketInput {
  tenantId: string;
  conversationId?: string | null;
  type: PulseTicketType;
  status?: PulseTicketStatus;
  title: string;
  summary?: string | null;
  confidence?: number | null;
  metadata?: Prisma.InputJsonValue;
}

export interface IPulseTicketRepository {
  findById(tenantId: string, id: string): Promise<{
    id: string;
    tenantId: string;
    conversationId: string | null;
    type: PulseTicketType;
    status: PulseTicketStatus;
  } | null>;
  list(tenantId: string, filter?: {
    page?: number;
    pageSize?: number;
    type?: PulseTicketType;
    status?: PulseTicketStatus;
  }): Promise<{
    data: Array<{
      id: string;
      tenantId: string;
      conversationId: string | null;
      type: PulseTicketType;
      status: PulseTicketStatus;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>;
  create(input: CreatePulseTicketInput): Promise<{
    id: string;
    tenantId: string;
    conversationId: string | null;
    type: PulseTicketType;
    status: PulseTicketStatus;
  }>;
}
