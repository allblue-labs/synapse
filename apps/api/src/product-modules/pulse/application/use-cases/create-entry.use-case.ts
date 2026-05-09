import {Inject, Injectable, NotFoundException} from '@nestjs/common';
import {PulseChannelProvider} from '@prisma/client';
import {UsageMeteringService, UsageMetricType} from '../../../../modules/usage/usage-metering.service';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
} from '../../domain/ports/pulse-repository.port';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';
import {
  IPulseChannelRepository,
  PULSE_CHANNEL_REPOSITORY,
} from '../../domain/ports/pulse-channel-repository.port';
import {
  IPulseConversationRepository,
  PULSE_CONVERSATION_REPOSITORY,
} from '../../domain/ports/pulse-conversation-repository.port';
import {PULSE_EVENT_TYPES} from '../../domain/pulse-event-types';
import {PulseQueueService} from '../../infrastructure/queues/pulse-queue.service';

export interface CreateEntryInput {
  tenantId: string;
  contactPhone: string;
  contactName?: string;
  originalMessage?: string;
  mediaUrl?: string;
  conversationId?: string;
  provider?: PulseChannelProvider;
  channelIdentifier?: string;
  participantRef?: string;
  participantLabel?: string;
}

@Injectable()
export class CreateEntryUseCase {
  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
    private readonly queues: PulseQueueService,
    private readonly usage: UsageMeteringService,
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
    @Inject(PULSE_CHANNEL_REPOSITORY)
    private readonly channels: IPulseChannelRepository,
    @Inject(PULSE_CONVERSATION_REPOSITORY)
    private readonly conversations: IPulseConversationRepository,
  ) {}

  async execute(input: CreateEntryInput) {
    const conversationId = await this.resolveConversationId(input);
    const entry = await this.repository.create({
      ...input,
      conversationId,
    });

    await this.queues.enqueueInbound({
      tenantId: input.tenantId,
      entryId: entry.id,
      conversationId: entry.conversationId,
      idempotencyKey: `pulse.inbound:${input.tenantId}:${entry.id}`,
    });

    await this.usage.record({
      tenantId: input.tenantId,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.AUTOMATION_EXECUTION,
      quantity: 1,
      unit: 'execution',
      resourceType: 'PulseEntry',
      resourceId: entry.id,
      idempotencyKey: `pulse-entry-created:${entry.id}`,
      metadata: {
        hasMedia: !!input.mediaUrl,
        provider: input.provider,
      },
    });
    await this.usage.record({
      tenantId: input.tenantId,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.MESSAGE,
      quantity: 1,
      unit: 'message',
      resourceType: 'PulseEntry',
      resourceId: entry.id,
      idempotencyKey: `pulse-entry-message:${entry.id}`,
      metadata: {
        hasMedia: !!input.mediaUrl,
        provider: input.provider,
        channelIdentifier: input.channelIdentifier,
      },
    });

    await this.events.record({
      tenantId: input.tenantId,
      eventType: PULSE_EVENT_TYPES.ENTRY_RECEIVED,
      conversationId: entry.conversationId ?? undefined,
      payload: {
        entryId: entry.id,
        hasMedia: !!input.mediaUrl,
      },
      metadata: {
        source: 'pulse.queue',
      },
    });

    return entry;
  }

  private async resolveConversationId(input: CreateEntryInput) {
    if (input.conversationId) {
      const conversation = await this.conversations.findById(
        input.tenantId,
        input.conversationId,
      );
      if (!conversation) {
        throw new NotFoundException(`Pulse conversation ${input.conversationId} not found`);
      }

      await this.events.record({
        tenantId: input.tenantId,
        eventType: PULSE_EVENT_TYPES.CONVERSATION_LINKED,
        conversationId: conversation.id,
        payload: {
          conversationId: conversation.id,
          source: 'direct_id',
        },
      });

      return conversation.id;
    }

    if (!input.provider || !input.channelIdentifier) {
      return undefined;
    }

    const channel = await this.channels.upsert({
      tenantId: input.tenantId,
      provider: input.provider,
      identifier: input.channelIdentifier,
      metadata: {
        source: 'pulse.entry',
      },
    });

    const conversation = await this.conversations.resolve({
      tenantId: input.tenantId,
      channelId: channel.id,
      participantRef: input.participantRef ?? input.contactPhone,
      participantLabel: input.participantLabel ?? input.contactName,
      metadata: {
        source: 'pulse.entry',
      },
    });

    await this.events.record({
      tenantId: input.tenantId,
      eventType: PULSE_EVENT_TYPES.CONVERSATION_RESOLVED,
      channelId: channel.id,
      conversationId: conversation.id,
      payload: {
        provider: input.provider,
        channelIdentifier: input.channelIdentifier,
        participantRef: input.participantRef ?? input.contactPhone,
      },
    });

    return conversation.id;
  }
}
