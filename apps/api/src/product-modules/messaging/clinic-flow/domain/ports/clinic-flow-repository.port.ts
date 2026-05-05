import {ClinicFlowStatus} from '@prisma/client';
import {ClinicFlowEntry} from '../entities/clinic-flow-entry.entity';

export interface ListEntriesFilter {
  status?: ClinicFlowStatus;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateEntryFields {
  status?: ClinicFlowStatus;
  transcription?: string;
  extractedData?: Record<string, unknown>;
  confidence?: number;
  aiSummary?: string;
  scheduledAt?: Date;
  errorMessage?: string | null;
  retryCount?: number;
  processingLogs?: Array<{at: string; stage: string; message: string}>;
}

export const CLINIC_FLOW_REPOSITORY = Symbol('CLINIC_FLOW_REPOSITORY');

export interface IClinicFlowRepository {
  findById(tenantId: string, id: string): Promise<ClinicFlowEntry | null>;
  list(tenantId: string, filter: ListEntriesFilter): Promise<PagedResult<ClinicFlowEntry>>;
  listFailed(tenantId: string): Promise<ClinicFlowEntry[]>;
  save(entry: ClinicFlowEntry): Promise<ClinicFlowEntry>;
  update(tenantId: string, id: string, fields: UpdateEntryFields): Promise<ClinicFlowEntry>;
  create(data: {
    tenantId: string;
    contactPhone: string;
    contactName?: string;
    originalMessage?: string;
    mediaUrl?: string;
    conversationId?: string;
  }): Promise<ClinicFlowEntry>;
}
