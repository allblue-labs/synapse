import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PulseKnowledgeContextType } from '@prisma/client';
import {
  PULSE_CONTEXT_PACK_VERSION,
  PulseContextAssemblyInput,
  PulseContextPack,
} from '../../contracts/pulse.contracts';
import {
  IPulseContextRepository,
  PULSE_CONTEXT_REPOSITORY,
  PulseContextKnowledgeRecord,
  PulseContextSourceData,
  PulseContextTimelineRecord,
} from '../../domain/ports/pulse-context-repository.port';

const SENSITIVE_KEY = /secret|token|password|credential|apiKey|authorization|raw|prompt|message|audio|media|transcript/i;

@Injectable()
export class AssemblePulseContextUseCase {
  constructor(
    @Inject(PULSE_CONTEXT_REPOSITORY)
    private readonly contexts: IPulseContextRepository,
  ) {}

  async execute(input: PulseContextAssemblyInput): Promise<PulseContextPack> {
    const source = await this.contexts.load(input);
    this.assertRequestedScopeExists(input, source);

    return {
      version: PULSE_CONTEXT_PACK_VERSION,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? input.tenantId,
      module: 'pulse',
      skill: input.skill,
      executionType: input.executionType,
      conversationState: source.conversation ? {
        id: source.conversation.id,
        state: source.conversation.state,
        operationalStatus: source.conversation.operationalStatus,
        confidence: source.conversation.confidence,
        lastActivityAt: source.conversation.lastActivityAt?.toISOString() ?? null,
        participantRef: this.maskIdentifier(source.conversation.participantRef),
        participantLabel: source.conversation.participantLabel,
        summary: this.stringValue(source.conversation.metadata, 'summary'),
        channel: {
          id: source.conversation.channel.id,
          provider: source.conversation.channel.provider,
          identifier: this.maskIdentifier(source.conversation.channel.identifier),
          status: source.conversation.channel.status,
          limits: this.auditSafeObject(source.conversation.channel.limits),
          metadata: this.auditSafeObject(source.conversation.channel.metadata),
        },
      } : null,
      ticketState: source.ticket ? {
        id: source.ticket.id,
        conversationId: source.ticket.conversationId,
        type: source.ticket.type,
        status: source.ticket.status,
        title: source.ticket.title,
        summary: source.ticket.summary,
        priority: source.ticket.priority,
        confidence: source.ticket.confidence,
        assignedUserId: source.ticket.assignedUserId,
        flowState: this.stringValue(source.ticket.metadata, 'flowState'),
        metadata: this.auditSafeObject(source.ticket.metadata),
        resolvedAt: source.ticket.resolvedAt?.toISOString() ?? null,
        updatedAt: source.ticket.updatedAt.toISOString(),
      } : null,
      playbookState: source.playbook ? {
        id: source.playbook.id,
        key: source.playbook.key,
        name: source.playbook.name,
        status: source.playbook.status,
        skill: source.playbook.skill,
        flow: this.auditSafeObject(source.playbook.flow),
        metadata: this.auditSafeObject(source.playbook.metadata),
        updatedAt: source.playbook.updatedAt.toISOString(),
      } : null,
      knowledgeSnippets: this.knowledgeByType(source.knowledge, [
        PulseKnowledgeContextType.FAQ,
        PulseKnowledgeContextType.BUSINESS_DESCRIPTION,
        PulseKnowledgeContextType.OPERATIONAL_INSTRUCTION,
      ]),
      productsOrServices: this.knowledgeByType(source.knowledge, [
        PulseKnowledgeContextType.PRODUCT_SERVICE,
      ]),
      campaignContext: this.knowledgeByType(source.knowledge, [
        PulseKnowledgeContextType.CAMPAIGN_PROMOTION,
      ]),
      schedulingContext: {
        providers: source.integrations.map((integration) => ({
          id: integration.id,
          provider: integration.provider,
          status: integration.status,
          displayName: integration.displayName,
          credentialsConfigured: integration.credentialsConfigured,
          settings: this.auditSafeObject(integration.settings),
          metadata: this.auditSafeObject(integration.metadata),
        })),
      },
      allowedActions: this.allowedActions(source),
      requiredOutputSchema: this.requiredOutputSchema(input.executionType),
      securityHints: [
        'Respect tenant scope and never request data outside this context pack.',
        'Return audit-safe decision summaries only; do not return chain-of-thought.',
        'Do not expose provider secrets, integration credential references, raw media, or raw mirrored chats.',
      ],
      usageHints: {
        moduleSlug: 'pulse',
        candidates: ['ai_execution', 'workflow_run'],
        tenantId: input.tenantId,
        conversationId: source.conversation?.id ?? null,
        ticketId: source.ticket?.id ?? null,
      },
      assembledAt: new Date().toISOString(),
    };
  }

  private assertRequestedScopeExists(input: PulseContextAssemblyInput, source: PulseContextSourceData) {
    if (input.conversationId && !source.conversation) {
      throw new NotFoundException('Pulse conversation context not found.');
    }

    if (input.ticketId && !source.ticket) {
      throw new NotFoundException('Pulse ticket context not found.');
    }

    if (input.playbookKey && !source.playbook) {
      throw new NotFoundException('Pulse playbook context not found.');
    }
  }

  private knowledgeByType(
    knowledge: PulseContextKnowledgeRecord[],
    types: PulseKnowledgeContextType[],
  ) {
    return knowledge
      .filter((item) => types.includes(item.type))
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content,
        metadata: this.auditSafeObject(item.metadata),
        updatedAt: item.updatedAt.toISOString(),
      }));
  }

  private allowedActions(source: PulseContextSourceData) {
    const actions = new Set<string>([
      'timeline.append',
      'execution.request',
      'operator.review.request',
    ]);

    if (source.ticket) {
      actions.add('ticket.assign');
      actions.add('ticket.escalate');
      actions.add('ticket.advance_flow');
      if (source.ticket.status !== 'RESOLVED' && source.ticket.status !== 'CANCELLED') {
        actions.add('ticket.resolve');
        actions.add('ticket.cancel');
      }
    }

    if (source.integrations.length > 0) {
      actions.add('schedule.check_availability');
    }

    return [...actions].sort();
  }

  private requiredOutputSchema(executionType: string) {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['decisionSummary', 'confidence', 'nextState', 'recommendedActions'],
      properties: {
        decisionSummary: { type: 'string', maxLength: 1000 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        nextState: { type: 'string' },
        recommendedActions: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 10,
        },
        executionType: { const: executionType },
      },
    };
  }

  private auditSafeObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(source).map(([key, current]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[REDACTED]' : this.auditSafeValue(current),
      ]),
    );
  }

  private auditSafeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.auditSafeValue(item));
    }

    if (value && typeof value === 'object') {
      return this.auditSafeObject(value);
    }

    return value;
  }

  private stringValue(value: unknown, key: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const result = (value as Record<string, unknown>)[key];
    return typeof result === 'string' ? result : null;
  }

  private maskIdentifier(identifier: string) {
    if (identifier.length <= 4) {
      return '****';
    }

    return `${'*'.repeat(Math.max(identifier.length - 4, 4))}${identifier.slice(-4)}`;
  }
}
