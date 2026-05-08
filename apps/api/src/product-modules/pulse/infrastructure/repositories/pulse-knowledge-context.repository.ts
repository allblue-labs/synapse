import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PulseKnowledgeContextStatus,
} from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  IPulseKnowledgeContextRepository,
  PublishPulseKnowledgeContextInput,
  PulseKnowledgeContextFilter,
} from '../../domain/ports/pulse-knowledge-context-repository.port';

@Injectable()
export class PulseKnowledgeContextRepository implements IPulseKnowledgeContextRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(tenantId: string, id: string) {
    return this.prisma.pulseKnowledgeContext.findFirst({
      where: { tenantId, id },
      select: this.selectKnowledgeContext(),
    });
  }

  async list(tenantId: string, filter: PulseKnowledgeContextFilter = {}) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.PulseKnowledgeContextWhereInput = {
      tenantId,
      ...(filter.type && { type: filter.type }),
      ...(filter.status && { status: filter.status }),
      ...(filter.query && {
        OR: [
          { title: { contains: filter.query, mode: 'insensitive' } },
          { content: { contains: filter.query, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.pulseKnowledgeContext.findMany({
        where,
        select: this.selectKnowledgeContext(),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.pulseKnowledgeContext.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  publish(input: PublishPulseKnowledgeContextInput) {
    return this.prisma.pulseKnowledgeContext.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        title: input.title,
        content: input.content,
        status: PulseKnowledgeContextStatus.ACTIVE,
        metadata: input.metadata ?? {},
      },
      select: this.selectKnowledgeContext(),
    });
  }

  async archive(tenantId: string, id: string) {
    const current = await this.findById(tenantId, id);
    if (!current) {
      return null;
    }

    return this.prisma.pulseKnowledgeContext.update({
      where: { id },
      data: { status: PulseKnowledgeContextStatus.ARCHIVED },
      select: this.selectKnowledgeContext(),
    });
  }

  private selectKnowledgeContext() {
    return {
      id: true,
      tenantId: true,
      type: true,
      title: true,
      content: true,
      status: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.PulseKnowledgeContextSelect;
  }
}
