import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ChannelType, MessageAuthorType, MessageDirection } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { ChannelAdapter } from './channel-adapter.interface';
import { DiscordAdapter } from './adapters/discord.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { QueueService } from '../queue/queue.service';
import { TaskEngineService } from '../../core/orchestration/task-engine.service';

type CreateChannelInput = {
  type: ChannelType;
  displayName: string;
  agentId?: string;
  externalId?: string;
};

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly discordAdapter: DiscordAdapter,
    private readonly whatsAppAdapter: WhatsAppAdapter,
    private readonly queueService: QueueService,
    private readonly taskEngine: TaskEngineService
  ) {}

  list(tenantId: string) {
    return this.prisma.channelAccount.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async create(tenantId: string, input: CreateChannelInput) {
    if (input.agentId) {
      const agent = await this.prisma.agent.findFirst({ where: { id: input.agentId, tenantId } });
      if (!agent) {
        throw new BadRequestException('Agent does not belong to this tenant.');
      }
    }

    return this.prisma.channelAccount.create({
      data: {
        tenantId,
        type: input.type,
        displayName: input.displayName,
        agentId: input.agentId,
        externalId: input.externalId,
        status: 'ACTIVE'
      }
    });
  }

  async receive(
    tenantId: string,
    channelAccountId: string,
    payload: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined> = {}
  ) {
    const channel = await this.prisma.channelAccount.findFirst({
      where: { id: channelAccountId, tenantId }
    });
    if (!channel) {
      throw new NotFoundException('Channel account not found.');
    }

    const adapter = this.adapterFor(channel.type);
    const validation = await adapter.validateWebhook(payload, headers);
    if (!validation.valid) {
      throw new UnauthorizedException(validation.reason ?? 'Invalid channel webhook.');
    }

    const normalized = adapter.normalizeInboundMessage(payload);

    const conversation = await this.prisma.conversation.upsert({
      where: {
        tenantId_channelAccountId_externalContactId: {
          tenantId,
          channelAccountId,
          externalContactId: normalized.externalContactId
        }
      },
      create: {
        tenantId,
        channelAccountId,
        agentId: channel.agentId,
        externalContactId: normalized.externalContactId,
        contactDisplayName: normalized.contactDisplayName
      },
      update: {
        contactDisplayName: normalized.contactDisplayName
      }
    });

    const message = await this.messagesService.create(tenantId, {
      conversationId: conversation.id,
      externalMessageId: normalized.externalMessageId,
      direction: MessageDirection.INBOUND,
      authorType: MessageAuthorType.CONTACT,
      content: normalized.text,
      normalizedPayload: {
        externalContactId: normalized.externalContactId,
        contactDisplayName: normalized.contactDisplayName,
        receivedAt: normalized.receivedAt.toISOString()
      },
      providerPayload: normalized.raw
    });

    await this.queueService.enqueueMessageProcessing({
      tenantId,
      channelAccountId,
      normalizedMessage: {
        tenantId,
        channelAccountId,
        channelType: channel.type,
        externalMessageId: normalized.externalMessageId,
        externalContactId: normalized.externalContactId,
        contactDisplayName: normalized.contactDisplayName,
        text: normalized.text,
        receivedAt: normalized.receivedAt.toISOString(),
        raw: normalized.raw
      }
    });

    await this.taskEngine.dispatch({
      id: `message:${message.id}`,
      type: 'message',
      tenantId,
      module: 'messaging',
      payload: {
        channelAccountId,
        conversationId: conversation.id,
        messageId: message.id,
        channelType: channel.type
      },
      priority: 5,
      metadata: {
        source: 'messaging.receive',
        externalMessageId: normalized.externalMessageId
      }
    });

    if (channel.agentId) {
      await this.queueService.enqueueAiResponse({
        tenantId,
        conversationId: conversation.id,
        agentId: channel.agentId,
        triggerMessageId: message.id
      });

      await this.taskEngine.dispatch({
        id: `llm:${conversation.id}:${message.id}`,
        type: 'llm',
        tenantId,
        module: 'messaging',
        payload: {
          conversationId: conversation.id,
          agentId: channel.agentId,
          triggerMessageId: message.id
        },
        priority: 6,
        metadata: {
          source: 'messaging.ai_response'
        }
      });
    }

    return message;
  }

  private adapterFor(type: ChannelType): ChannelAdapter {
    if (type === ChannelType.TELEGRAM) {
      return this.telegramAdapter;
    }
    if (type === ChannelType.DISCORD) {
      return this.discordAdapter;
    }
    if (type === ChannelType.WHATSAPP) {
      return this.whatsAppAdapter;
    }

    throw new BadRequestException(`Channel ${type} is not implemented yet.`);
  }
}
