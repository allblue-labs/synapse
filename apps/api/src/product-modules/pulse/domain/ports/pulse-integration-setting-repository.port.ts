import { IntegrationProvider, IntegrationStatus, Prisma } from '@prisma/client';

export const PULSE_INTEGRATION_SETTING_REPOSITORY = Symbol('PULSE_INTEGRATION_SETTING_REPOSITORY');

export interface PulseIntegrationSettingRecord {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  displayName: string;
  externalRef: string | null;
  settings: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  credentialsConfigured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PulseIntegrationSettingFilter {
  page?: number;
  pageSize?: number;
  provider?: IntegrationProvider;
  status?: IntegrationStatus;
}

export interface IPulseIntegrationSettingRepository {
  findById(tenantId: string, id: string): Promise<PulseIntegrationSettingRecord | null>;
  list(tenantId: string, filter?: PulseIntegrationSettingFilter): Promise<{
    data: PulseIntegrationSettingRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
