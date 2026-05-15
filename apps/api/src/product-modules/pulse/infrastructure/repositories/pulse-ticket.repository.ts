import { Injectable } from '@nestjs/common';
import { Prisma, PulseTicketStatus, PulseTicketType } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  CreatePulseTicketInput,
  IPulseTicketRepository,
  UpdatePulseTicketInput,
} from '../../domain/ports/pulse-ticket-repository.port';
import { withPulseTenantContext } from './pulse-tenant-context';

@Injectable()
export class PulseTicketRepository implements IPulseTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string) {
    return withPulseTenantContext(this.prisma, tenantId, (tx) => tx.pulseTicket.findFirst({
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
    }));
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
    const [data, total] = await withPulseTenantContext(this.prisma, tenantId, (tx) => Promise.all([
      tx.pulseTicket.findMany({
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
      tx.pulseTicket.count({ where }),
    ]));

    return { data, total, page, pageSize };
  }

  async create(input: CreatePulseTicketInput) {
    return withPulseTenantContext(this.prisma, input.tenantId, (tx) => tx.pulseTicket.create({
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
    }));
  }

  async update(tenantId: string, id: string, input: UpdatePulseTicketInput) {
    return withPulseTenantContext(this.prisma, tenantId, async (tx) => {
      const current = await tx.pulseTicket.findFirst({
        where: { tenantId, id },
        select: { id: true },
      });
      if (!current) {
        return null;
      }

      return tx.pulseTicket.update({
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
    });
  }
}
