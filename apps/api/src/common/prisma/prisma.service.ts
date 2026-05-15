import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async withTenantContext<T>(
    tenantId: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options: { platformBypass?: boolean } = {},
  ): Promise<T> {
    if (!tenantId?.trim()) {
      throw new Error('tenantId is required for tenant-scoped database transactions');
    }

    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      await tx.$executeRaw`SELECT set_config('app.platform_bypass', ${options.platformBypass === true ? 'true' : 'false'}, true)`;
      return callback(tx);
    });
  }
}
