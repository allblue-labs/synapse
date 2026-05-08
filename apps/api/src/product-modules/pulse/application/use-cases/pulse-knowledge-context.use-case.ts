import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  PulseActorType,
  PulseKnowledgeContextStatus,
  PulseKnowledgeContextType,
} from '@prisma/client';
import { AuditService } from '../../../../common/audit/audit.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user';
import { UsageMeteringService, UsageMetricType } from '../../../../modules/usage/usage-metering.service';
import { PULSE_EVENT_TYPES } from '../../domain/pulse-event-types';
import {
  IPulseKnowledgeContextRepository,
  PULSE_KNOWLEDGE_CONTEXT_REPOSITORY,
  PulseKnowledgeContextFilter,
} from '../../domain/ports/pulse-knowledge-context-repository.port';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';
import { pulseEventPayload } from '../services/pulse-event-payload';

@Injectable()
export class PulseKnowledgeContextUseCase {
  constructor(
    @Inject(PULSE_KNOWLEDGE_CONTEXT_REPOSITORY)
    private readonly knowledge: IPulseKnowledgeContextRepository,
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
    private readonly audit: AuditService,
    private readonly usage: UsageMeteringService,
  ) {}

  list(tenantId: string, filter?: PulseKnowledgeContextFilter) {
    return this.knowledge.list(tenantId, filter);
  }

  async get(tenantId: string, id: string) {
    const context = await this.knowledge.findById(tenantId, id);
    if (!context) {
      throw new NotFoundException('Pulse knowledge context not found.');
    }
    return context;
  }

  async publish(
    tenantId: string,
    actor: AuthenticatedUser,
    input: {
      type: PulseKnowledgeContextType;
      title: string;
      content: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const context = await this.knowledge.publish({
      tenantId,
      type: input.type,
      title: input.title,
      content: input.content,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    });
    await this.recordKnowledgeEvent(
      tenantId,
      actor,
      PULSE_EVENT_TYPES.KNOWLEDGE_PUBLISHED,
      'publish_knowledge_context',
      context.id,
      {
        type: context.type,
        title: context.title,
      },
    );
    await this.usage.record({
      tenantId,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.STORAGE,
      quantity: Buffer.byteLength(context.content, 'utf8'),
      unit: 'byte',
      resourceType: 'PulseKnowledgeContext',
      resourceId: context.id,
      idempotencyKey: `pulse-knowledge-storage:${context.id}`,
      metadata: {
        type: context.type,
      },
    });
    return context;
  }

  async archive(tenantId: string, actor: AuthenticatedUser, id: string) {
    const context = await this.knowledge.archive(tenantId, id);
    if (!context) {
      throw new NotFoundException('Pulse knowledge context not found.');
    }
    await this.recordKnowledgeEvent(
      tenantId,
      actor,
      PULSE_EVENT_TYPES.KNOWLEDGE_ARCHIVED,
      'archive_knowledge_context',
      context.id,
      {
        type: context.type,
        title: context.title,
      },
    );
    await this.usage.record({
      tenantId,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.AUTOMATION_EXECUTION,
      quantity: 1,
      unit: 'knowledge_operation',
      resourceType: 'PulseKnowledgeContext',
      resourceId: context.id,
      idempotencyKey: `pulse-knowledge-archive:${context.id}`,
      metadata: {
        action: 'archive',
        type: context.type,
      },
    });
    return context;
  }

  query(
    tenantId: string,
    input: {
      query: string;
      type?: PulseKnowledgeContextFilter['type'];
      limit?: number;
    },
  ) {
    return this.knowledge.list(tenantId, {
      page: 1,
      pageSize: input.limit ?? 5,
      status: PulseKnowledgeContextStatus.ACTIVE,
      type: input.type,
      query: input.query,
    });
  }

  private async recordKnowledgeEvent(
    tenantId: string,
    actor: AuthenticatedUser,
    eventType: string,
    action: string,
    contextId: string,
    data: Record<string, unknown>,
  ) {
    const payload = pulseEventPayload(action, {
      knowledgeContextId: contextId,
      ...data,
    });
    await this.events.record({
      tenantId,
      eventType,
      actorType: PulseActorType.USER,
      actorUserId: actor.sub,
      payload,
      metadata: {
        usageCandidate: 'knowledge_context_operation',
      },
    });
    await this.audit.record({
      tenantId,
      actorUserId: actor.sub,
      action: eventType,
      resourceType: 'PulseKnowledgeContext',
      resourceId: contextId,
      metadata: payload,
    });
  }
}
