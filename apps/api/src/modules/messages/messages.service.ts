import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateMessageDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: dto.conversationId, tenantId }
    });
    if (!conversation) {
      throw new BadRequestException('Conversation does not belong to this tenant.');
    }

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          tenantId,
          conversationId: dto.conversationId,
          externalMessageId: dto.externalMessageId,
          direction: dto.direction,
          authorType: dto.authorType,
          content: dto.content,
          normalizedPayload: (dto.normalizedPayload ?? {}) as Prisma.InputJsonValue,
          providerPayload: (dto.providerPayload ?? {}) as Prisma.InputJsonValue,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue
        }
      });

      await tx.conversation.update({
        where: { id: dto.conversationId },
        data: { lastMessageAt: message.createdAt }
      });

      return message;
    });
  }
}
