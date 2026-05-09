import {
  IntegrationProvider,
  IntegrationStatus,
  Prisma,
  PulseChannelProvider,
  PulseChannelStatus,
  PulseConversationState,
  PulseKnowledgeContextType,
  PulseOperationalStatus,
  PulsePlaybookStatus,
  PulseSkillStatus,
  PulseSkillType,
  PulseTicketStatus,
  PulseTicketType,
} from '@prisma/client';
import { PulseContextAssemblyInput } from '../../contracts/pulse.contracts';

export const PULSE_CONTEXT_REPOSITORY = Symbol('PULSE_CONTEXT_REPOSITORY');

export interface PulseContextChannelRecord {
  id: string;
  provider: PulseChannelProvider;
  identifier: string;
  status: PulseChannelStatus;
  limits: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
}

export interface PulseContextConversationRecord {
  id: string;
  tenantId: string;
  channelId: string;
  participantRef: string;
  participantLabel: string | null;
  state: PulseConversationState;
  operationalStatus: PulseOperationalStatus;
  confidence: number | null;
  lastActivityAt: Date | null;
  metadata: Prisma.JsonValue;
  channel: PulseContextChannelRecord;
}

export interface PulseContextTicketRecord {
  id: string;
  tenantId: string;
  conversationId: string | null;
  type: PulseTicketType;
  status: PulseTicketStatus;
  title: string;
  summary: string | null;
  priority: number;
  confidence: number | null;
  assignedUserId: string | null;
  metadata: Prisma.JsonValue;
  resolvedAt: Date | null;
  updatedAt: Date;
}

export interface PulseContextPlaybookRecord {
  id: string;
  key: string;
  name: string;
  status: PulsePlaybookStatus;
  skill: PulseSkillType | null;
  flow: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  updatedAt: Date;
}

export interface PulseContextKnowledgeRecord {
  id: string;
  type: PulseKnowledgeContextType;
  title: string;
  content: string;
  metadata: Prisma.JsonValue;
  updatedAt: Date;
}

export interface PulseContextSkillRecord {
  id: string;
  type: PulseSkillType;
  status: PulseSkillStatus;
  config: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
}

export interface PulseContextIntegrationRecord {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  displayName: string;
  settings: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  credentialsConfigured: boolean;
}

export interface PulseContextTimelineRecord {
  id: string;
  eventType: string;
  actorType: string;
  actorUserId: string | null;
  channelId: string | null;
  conversationId: string | null;
  ticketId: string | null;
  payload: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  occurredAt: Date;
}

export interface PulseContextSourceData {
  conversation: PulseContextConversationRecord | null;
  ticket: PulseContextTicketRecord | null;
  playbook: PulseContextPlaybookRecord | null;
  skill: PulseContextSkillRecord | null;
  knowledge: PulseContextKnowledgeRecord[];
  integrations: PulseContextIntegrationRecord[];
  timeline: PulseContextTimelineRecord[];
}

export interface IPulseContextRepository {
  load(input: PulseContextAssemblyInput): Promise<PulseContextSourceData>;
}
