import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export type PulseTenantTransaction = Prisma.TransactionClient;

export function withPulseTenantContext<T>(
  prisma: PrismaService,
  tenantId: string,
  callback: (tx: PulseTenantTransaction) => Promise<T>,
): Promise<T> {
  const maybePrisma = prisma as PrismaService & {
    withTenantContext?: PrismaService['withTenantContext'];
  };

  if (typeof maybePrisma.withTenantContext === 'function') {
    return maybePrisma.withTenantContext(tenantId, callback);
  }

  return callback(prisma as unknown as PulseTenantTransaction);
}
