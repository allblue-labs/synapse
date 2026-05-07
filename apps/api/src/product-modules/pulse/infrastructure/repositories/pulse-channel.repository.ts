import { Injectable } from '@nestjs/common';
import { Prisma, PulseChannelProvider, PulseChannelStatus } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  IPulseChannelRepository,
  UpsertPulseChannelInput,
} from '../../domain/ports/pulse-channel-repository.port';

@Injectable()
export class PulseChannelRepository implements IPulseChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string) {
    return this.prisma.pulseChannel.findFirst({
      where: { tenantId, id },
      select: {
        id: true,
        tenantId: true,
        provider: true,
        identifier: true,
        status: true,
      },
    });
  }

  async list(tenantId: string, filter: {
    page?: number;
    pageSize?: number;
    provider?: PulseChannelProvider;
    status?: PulseChannelStatus;
  } = {}) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.PulseChannelWhereInput = {
      tenantId,
      ...(filter.provider && { provider: filter.provider }),
      ...(filter.status && { status: filter.status }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.pulseChannel.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          provider: true,
          identifier: true,
          status: true,
        },
        orderBy: [{ provider: 'asc' }, { identifier: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.pulseChannel.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async upsert(input: UpsertPulseChannelInput) {
    return this.prisma.pulseChannel.upsert({
      where: {
        tenantId_provider_identifier: {
          tenantId: input.tenantId,
          provider: input.provider,
          identifier: input.identifier,
        },
      },
      create: {
        tenantId: input.tenantId,
        provider: input.provider,
        identifier: input.identifier,
        status: input.status ?? PulseChannelStatus.ACTIVE,
        limits: input.limits ?? {},
        metadata: input.metadata ?? {},
      },
      update: {
        status: input.status ?? PulseChannelStatus.ACTIVE,
        limits: input.limits ?? {},
        metadata: input.metadata ?? {},
      },
      select: {
        id: true,
        tenantId: true,
        provider: true,
        identifier: true,
        status: true,
      },
    });
  }
}
