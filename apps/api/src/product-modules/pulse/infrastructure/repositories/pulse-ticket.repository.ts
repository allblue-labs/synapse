import { Injectable } from '@nestjs/common';
import { Prisma, PulseTicketStatus, PulseTicketType } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  CreatePulseTicketInput,
  IPulseTicketRepository,
  UpdatePulseTicketInput,
} from '../../domain/ports/pulse-ticket-repository.port';

@Injectable()
export class PulseTicketRepository implements IPulseTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string) {
    return this.prisma.pulseTicket.findFirst({
      where: { tenantId, id },
      select: {
        id: true,
        tenantId: true,
        conversationId: true,
        type: true,
        status: true,
        assignedUserId: true,
        confidence: true,
        metadata: true,
        priority: true,
        resolvedAt: true,
      },
    });
  }

  async list(tenantId: string, filter: {
    page?: number;
    pageSize?: number;
    type?: PulseTicketType;
    status?: PulseTicketStatus;
  } = {}) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.PulseTicketWhereInput = {
      tenantId,
      ...(filter.type && { type: filter.type }),
      ...(filter.status && { status: filter.status }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.pulseTicket.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          conversationId: true,
          type: true,
          status: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.pulseTicket.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(input: CreatePulseTicketInput) {
    return this.prisma.pulseTicket.create({
      data: {
        tenantId: input.tenantId,
        conversationId: input.conversationId ?? null,
        type: input.type,
        status: input.status ?? PulseTicketStatus.OPEN,
        title: input.title,
        summary: input.summary,
        confidence: input.confidence,
        metadata: input.metadata ?? {},
      },
      select: {
        id: true,
        tenantId: true,
        conversationId: true,
        type: true,
        status: true,
        assignedUserId: true,
        confidence: true,
        metadata: true,
        priority: true,
        resolvedAt: true,
      },
    });
  }

  async update(tenantId: string, id: string, input: UpdatePulseTicketInput) {
    const current = await this.findById(tenantId, id);
    if (!current) {
      return null;
    }

    return this.prisma.pulseTicket.update({
      where: { id },
      data: {
        status: input.status,
        assignedUserId: input.assignedUserId,
        confidence: input.confidence,
        priority: input.priority,
        metadata: input.metadata,
        resolvedAt: input.resolvedAt,
      },
      select: {
        id: true,
        tenantId: true,
        conversationId: true,
        type: true,
        status: true,
        assignedUserId: true,
        confidence: true,
        metadata: true,
        priority: true,
        resolvedAt: true,
      },
    });
  }
}
