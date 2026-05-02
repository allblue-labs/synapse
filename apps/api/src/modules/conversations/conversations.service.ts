import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.conversation.findMany({
      where: { tenantId },
      include: {
        agent: { select: { id: true, name: true, status: true } },
        channelAccount: { select: { id: true, type: true, displayName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async create(tenantId: string, dto: CreateConversationDto) {
    const channel = await this.prisma.channelAccount.findFirst({
      where: { id: dto.channelAccountId, tenantId }
    });
    if (!channel) {
      throw new BadRequestException('Channel account does not belong to this tenant.');
    }

    if (dto.agentId) {
      const agent = await this.prisma.agent.findFirst({ where: { id: dto.agentId, tenantId } });
      if (!agent) {
        throw new BadRequestException('Agent does not belong to this tenant.');
      }
    }

    return this.prisma.conversation.create({
      data: {
        tenantId,
        channelAccountId: dto.channelAccountId,
        agentId: dto.agentId,
        externalContactId: dto.externalContactId,
        contactDisplayName: dto.contactDisplayName
      }
    });
  }

  async get(tenantId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenantId },
      include: {
        agent: true,
        channelAccount: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    return conversation;
  }

  async update(tenantId: string, id: string, dto: UpdateConversationDto) {
    await this.get(tenantId, id);

    if (dto.agentId) {
      const agent = await this.prisma.agent.findFirst({ where: { id: dto.agentId, tenantId } });
      if (!agent) {
        throw new BadRequestException('Agent does not belong to this tenant.');
      }
    }

    const data: Prisma.ConversationUncheckedUpdateInput = {
      status: dto.status,
      agentId: dto.agentId,
      extractedData: dto.extractedData as Prisma.InputJsonValue | undefined
    };

    return this.prisma.conversation.update({
      where: { id },
      data
    });
  }
}
