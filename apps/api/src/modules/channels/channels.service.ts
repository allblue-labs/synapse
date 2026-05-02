import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChannelType, MessageAuthorType, MessageDirection } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { ChannelAdapter } from './channel-adapter.interface';

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
    private readonly telegramAdapter: TelegramAdapter
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

  async receive(tenantId: string, channelAccountId: string, payload: Record<string, unknown>) {
    const channel = await this.prisma.channelAccount.findFirst({
      where: { id: channelAccountId, tenantId }
    });
    if (!channel) {
      throw new NotFoundException('Channel account not found.');
    }

    const adapter = this.adapterFor(channel.type);
    const normalized = await adapter.receiveMessage(payload);

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

    return this.messagesService.create(tenantId, {
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
  }

  private adapterFor(type: ChannelType): ChannelAdapter {
    if (type === ChannelType.TELEGRAM) {
      return this.telegramAdapter;
    }

    throw new BadRequestException(`Channel ${type} is not implemented yet.`);
  }
}
