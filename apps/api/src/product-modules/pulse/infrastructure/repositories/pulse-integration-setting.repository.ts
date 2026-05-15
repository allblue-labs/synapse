import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  IPulseIntegrationSettingRepository,
  PulseIntegrationSettingFilter,
} from '../../domain/ports/pulse-integration-setting-repository.port';
import { withPulseTenantContext } from './pulse-tenant-context';

@Injectable()
export class PulseIntegrationSettingRepository implements IPulseIntegrationSettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string) {
    const setting = await withPulseTenantContext(this.prisma, tenantId, (tx) => tx.integrationSetting.findFirst({
      where: { tenantId, id },
      select: this.selectIntegrationSetting(),
    }));
    return setting ? this.toRecord(setting) : null;
  }

  async list(tenantId: string, filter: PulseIntegrationSettingFilter = {}) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.IntegrationSettingWhereInput = {
      tenantId,
      ...(filter.provider && { provider: filter.provider }),
      ...(filter.status && { status: filter.status }),
    };
    const [items, total] = await withPulseTenantContext(this.prisma, tenantId, (tx) => Promise.all([
      tx.integrationSetting.findMany({
        where,
        select: this.selectIntegrationSetting(),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      tx.integrationSetting.count({ where }),
    ]));

    return {
      data: items.map((item) => this.toRecord(item)),
      total,
      page,
      pageSize,
    };
  }

  private selectIntegrationSetting() {
    return {
      id: true,
      tenantId: true,
      provider: true,
      status: true,
      displayName: true,
      externalRef: true,
      settings: true,
      credentialsRef: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.IntegrationSettingSelect;
  }

  private toRecord(setting: Prisma.IntegrationSettingGetPayload<{
    select: ReturnType<PulseIntegrationSettingRepository['selectIntegrationSetting']>;
  }>) {
    return {
      id: setting.id,
      tenantId: setting.tenantId,
      provider: setting.provider,
      status: setting.status,
      displayName: setting.displayName,
      externalRef: setting.externalRef,
      settings: setting.settings,
      metadata: setting.metadata,
      credentialsConfigured: Boolean(setting.credentialsRef),
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }
}
