import {
  Prisma,
  PulseConversationState,
  PulseOperationalStatus,
} from '@prisma/client';

export const PULSE_CONVERSATION_REPOSITORY = Symbol('PULSE_CONVERSATION_REPOSITORY');

export interface ResolvePulseConversationInput {
  tenantId: string;
  channelId: string;
  participantRef: string;
  participantLabel?: string;
  state?: PulseConversationState;
  operationalStatus?: PulseOperationalStatus;
  confidence?: number;
  metadata?: Prisma.InputJsonValue;
}

export interface IPulseConversationRepository {
  list(tenantId: string, filter?: {
    page?: number;
    pageSize?: number;
    state?: PulseConversationState;
    operationalStatus?: PulseOperationalStatus;
  }): Promise<{
    data: Array<{
      id: string;
      tenantId: string;
      channelId: string;
      participantRef: string;
      state: PulseConversationState;
      operationalStatus: PulseOperationalStatus;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>;
  findById(tenantId: string, id: string): Promise<{
    id: string;
    tenantId: string;
    channelId: string;
    participantRef: string;
    state: PulseConversationState;
    operationalStatus: PulseOperationalStatus;
  } | null>;
  resolve(input: ResolvePulseConversationInput): Promise<{
    id: string;
    tenantId: string;
    channelId: string;
    participantRef: string;
    state: PulseConversationState;
    operationalStatus: PulseOperationalStatus;
  }>;
}
