import { Injectable } from '@nestjs/common';
import { Prisma, PulseConversationState, PulseOperationalStatus } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  IPulseConversationRepository,
  ResolvePulseConversationInput,
} from '../../domain/ports/pulse-conversation-repository.port';

@Injectable()
export class PulseConversationRepository implements IPulseConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, filter: {
    page?: number;
    pageSize?: number;
    state?: PulseConversationState;
    operationalStatus?: PulseOperationalStatus;
  } = {}) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.PulseConversationWhereInput = {
      tenantId,
      ...(filter.state && { state: filter.state }),
      ...(filter.operationalStatus && { operationalStatus: filter.operationalStatus }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.pulseConversation.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          channelId: true,
          participantRef: true,
          state: true,
          operationalStatus: true,
        },
        orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.pulseConversation.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.pulseConversation.findFirst({
      where: { tenantId, id },
      select: {
        id: true,
        tenantId: true,
        channelId: true,
        participantRef: true,
        state: true,
        operationalStatus: true,
      },
    });
  }

  async resolve(input: ResolvePulseConversationInput) {
    const now = new Date();
    return this.prisma.pulseConversation.upsert({
      where: {
        tenantId_channelId_participantRef: {
          tenantId: input.tenantId,
          channelId: input.channelId,
          participantRef: input.participantRef,
        },
      },
      create: {
        tenantId: input.tenantId,
        channelId: input.channelId,
        participantRef: input.participantRef,
        participantLabel: input.participantLabel,
        state: input.state ?? PulseConversationState.NEW,
        operationalStatus: input.operationalStatus ?? PulseOperationalStatus.ACTIVE,
        confidence: input.confidence,
        lastActivityAt: now,
        metadata: input.metadata ?? {},
      },
      update: {
        ...(input.participantLabel !== undefined && { participantLabel: input.participantLabel }),
        state: input.state ?? PulseConversationState.IN_FLOW,
        operationalStatus: input.operationalStatus ?? PulseOperationalStatus.ACTIVE,
        ...(input.confidence !== undefined && { confidence: input.confidence }),
        lastActivityAt: now,
        metadata: input.metadata ?? {},
      },
      select: {
        id: true,
        tenantId: true,
        channelId: true,
        participantRef: true,
        state: true,
        operationalStatus: true,
      },
    });
  }
}
