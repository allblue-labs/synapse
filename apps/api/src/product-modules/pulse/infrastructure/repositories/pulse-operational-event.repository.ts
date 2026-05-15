import { Injectable } from '@nestjs/common';
import { Prisma, PulseActorType } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  CreatePulseOperationalEventInput,
  IPulseOperationalEventRepository,
  PulseOperationalTimelineFilter,
} from '../../domain/ports/pulse-operational-event-repository.port';
import { withPulseTenantContext } from './pulse-tenant-context';

@Injectable()
export class PulseOperationalEventRepository implements IPulseOperationalEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: CreatePulseOperationalEventInput) {
    return withPulseTenantContext(this.prisma, input.tenantId, (tx) => tx.pulseOperationalEvent.create({
      data: {
        tenantId: input.tenantId,
        eventType: input.eventType,
        actorType: input.actorType ?? PulseActorType.SYSTEM,
        actorUserId: input.actorUserId,
        channelId: input.channelId,
        conversationId: input.conversationId,
        ticketId: input.ticketId,
        payload: input.payload ?? {},
        metadata: this.auditSafeMetadata(input.metadata),
        occurredAt: input.occurredAt,
      },
      select: {
        id: true,
        tenantId: true,
        eventType: true,
        occurredAt: true,
      },
    }));
  }

  async listForConversation(
    tenantId: string,
    conversationId: string,
    filter: {
      page?: number;
      pageSize?: number;
      eventType?: string;
      eventTypes?: ReadonlyArray<string>;
      occurredFrom?: Date;
      occurredTo?: Date;
    } = {},
  ) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.PulseOperationalEventWhereInput = {
      tenantId,
      conversationId,
      ...this.eventTypeFilter(filter),
      ...this.occurredAtFilter(filter),
    };
    const [data, total] = await withPulseTenantContext(this.prisma, tenantId, (tx) => Promise.all([
      tx.pulseOperationalEvent.findMany({
        where,
        select: {
          ...this.timelineSelect(),
        },
        orderBy: { occurredAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      tx.pulseOperationalEvent.count({ where }),
    ]));

    return { data, total, page, pageSize };
  }

  async listForTicket(
    tenantId: string,
    ticketId: string,
    filter: {
      page?: number;
      pageSize?: number;
      eventType?: string;
      eventTypes?: ReadonlyArray<string>;
      occurredFrom?: Date;
      occurredTo?: Date;
    } = {},
  ) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.PulseOperationalEventWhereInput = {
      tenantId,
      ticketId,
      ...this.eventTypeFilter(filter),
      ...this.occurredAtFilter(filter),
    };
    const [data, total] = await withPulseTenantContext(this.prisma, tenantId, (tx) => Promise.all([
      tx.pulseOperationalEvent.findMany({
        where,
        select: {
          ...this.timelineSelect(),
        },
        orderBy: { occurredAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      tx.pulseOperationalEvent.count({ where }),
    ]));

    return { data, total, page, pageSize };
  }

  private auditSafeMetadata(metadata?: Prisma.InputJsonValue): Prisma.InputJsonValue {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return metadata ?? {};
    }

    const redacted = { ...(metadata as Record<string, unknown>) };
    for (const key of Object.keys(redacted)) {
      if (/secret|token|password|credential|apiKey/i.test(key)) {
        redacted[key] = '[REDACTED]';
      }
    }
    return redacted as Prisma.InputJsonValue;
  }

  private occurredAtFilter(filter: { occurredFrom?: Date; occurredTo?: Date }) {
    if (!filter.occurredFrom && !filter.occurredTo) {
      return {};
    }

    return {
      occurredAt: {
        ...(filter.occurredFrom && { gte: filter.occurredFrom }),
        ...(filter.occurredTo && { lte: filter.occurredTo }),
      },
    };
  }

  private eventTypeFilter(filter: PulseOperationalTimelineFilter): Prisma.PulseOperationalEventWhereInput {
    if (filter.eventTypes?.length) {
      return { eventType: { in: [...filter.eventTypes] } };
    }

    if (filter.eventType) {
      return { eventType: filter.eventType };
    }

    return {};
  }

  private timelineSelect() {
    return {
      id: true,
      tenantId: true,
      eventType: true,
      actorType: true,
      actorUserId: true,
      channelId: true,
      conversationId: true,
      ticketId: true,
      payload: true,
      metadata: true,
      occurredAt: true,
    } satisfies Prisma.PulseOperationalEventSelect;
  }
}
