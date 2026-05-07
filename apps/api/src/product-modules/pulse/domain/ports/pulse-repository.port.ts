import {PulseStatus} from '@prisma/client';
import {PulseExtractedData} from '../../contracts/pulse.contracts';
import {PulseEntry} from '../entities/pulse-entry.entity';

export interface ListEntriesFilter {
  status?: PulseStatus;
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
  status?: PulseStatus;
  transcription?: string;
  extractedData?: PulseExtractedData;
  confidence?: number;
  aiSummary?: string;
  scheduledAt?: Date;
  errorMessage?: string | null;
  retryCount?: number;
  processingLogs?: Array<{at: string; stage: string; message: string}>;
}

export const PULSE_REPOSITORY = Symbol('PULSE_REPOSITORY');

export interface IPulseRepository {
  findById(tenantId: string, id: string): Promise<PulseEntry | null>;
  list(tenantId: string, filter: ListEntriesFilter): Promise<PagedResult<PulseEntry>>;
  listFailed(tenantId: string): Promise<PulseEntry[]>;
  save(entry: PulseEntry): Promise<PulseEntry>;
  update(tenantId: string, id: string, fields: UpdateEntryFields): Promise<PulseEntry>;
  create(data: {
    tenantId: string;
    contactPhone: string;
    contactName?: string;
    originalMessage?: string;
    mediaUrl?: string;
    conversationId?: string;
  }): Promise<PulseEntry>;
}
