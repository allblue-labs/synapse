import { Prisma, PulseChannelProvider, PulseChannelStatus } from '@prisma/client';

export const PULSE_CHANNEL_REPOSITORY = Symbol('PULSE_CHANNEL_REPOSITORY');

export interface UpsertPulseChannelInput {
  tenantId: string;
  provider: PulseChannelProvider;
  identifier: string;
  status?: PulseChannelStatus;
  limits?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

export interface IPulseChannelRepository {
  findById(tenantId: string, id: string): Promise<{
    id: string;
    tenantId: string;
    provider: PulseChannelProvider;
    identifier: string;
    status: PulseChannelStatus;
  } | null>;
  list(tenantId: string, filter?: {
    page?: number;
    pageSize?: number;
    provider?: PulseChannelProvider;
    status?: PulseChannelStatus;
  }): Promise<{
    data: Array<{
      id: string;
      tenantId: string;
      provider: PulseChannelProvider;
      identifier: string;
      status: PulseChannelStatus;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>;
  upsert(input: UpsertPulseChannelInput): Promise<{
    id: string;
    tenantId: string;
    provider: PulseChannelProvider;
    identifier: string;
    status: PulseChannelStatus;
  }>;
}
