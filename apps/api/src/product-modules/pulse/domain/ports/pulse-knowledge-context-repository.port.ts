import {
  Prisma,
  PulseKnowledgeContextStatus,
  PulseKnowledgeContextType,
} from '@prisma/client';

export const PULSE_KNOWLEDGE_CONTEXT_REPOSITORY = Symbol('PULSE_KNOWLEDGE_CONTEXT_REPOSITORY');

export interface PulseKnowledgeContextRecord {
  id: string;
  tenantId: string;
  type: PulseKnowledgeContextType;
  title: string;
  content: string;
  status: PulseKnowledgeContextStatus;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishPulseKnowledgeContextInput {
  tenantId: string;
  type: PulseKnowledgeContextType;
  title: string;
  content: string;
  metadata?: Prisma.InputJsonValue;
}

export interface PulseKnowledgeContextFilter {
  page?: number;
  pageSize?: number;
  type?: PulseKnowledgeContextType;
  status?: PulseKnowledgeContextStatus;
  query?: string;
}

export interface IPulseKnowledgeContextRepository {
  findById(tenantId: string, id: string): Promise<PulseKnowledgeContextRecord | null>;
  list(tenantId: string, filter?: PulseKnowledgeContextFilter): Promise<{
    data: PulseKnowledgeContextRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  publish(input: PublishPulseKnowledgeContextInput): Promise<PulseKnowledgeContextRecord>;
  archive(tenantId: string, id: string): Promise<PulseKnowledgeContextRecord | null>;
}
