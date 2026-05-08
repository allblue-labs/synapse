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

export interface PulseTicketRecord {
  id: string;
  tenantId: string;
  conversationId: string | null;
  type: PulseTicketType;
  status: PulseTicketStatus;
  assignedUserId: string | null;
  confidence: number | null;
  metadata: Prisma.JsonValue;
  priority: number;
  resolvedAt: Date | null;
}

export interface UpdatePulseTicketInput {
  status?: PulseTicketStatus;
  assignedUserId?: string | null;
  confidence?: number | null;
  priority?: number;
  metadata?: Prisma.InputJsonValue;
  resolvedAt?: Date | null;
}

export interface IPulseTicketRepository {
  findById(tenantId: string, id: string): Promise<PulseTicketRecord | null>;
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
  create(input: CreatePulseTicketInput): Promise<PulseTicketRecord>;
  update(tenantId: string, id: string, input: UpdatePulseTicketInput): Promise<PulseTicketRecord | null>;
}
