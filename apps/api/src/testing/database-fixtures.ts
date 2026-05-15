import { PrismaService } from '../common/prisma/prisma.service';

export const RUN_DATABASE_TESTS = process.env.RUN_DATABASE_TESTS === '1';
export const describeDatabase = RUN_DATABASE_TESTS ? describe : describe.skip;

export function databaseFixtureIds(scope: string) {
  const prefix = `db-${scope}-${process.pid}`;
  return {
    tenantA: `${prefix}-tenant-a`,
    tenantB: `${prefix}-tenant-b`,
    slugA: `${prefix}-tenant-a`,
    slugB: `${prefix}-tenant-b`,
  };
}

export async function resetTenantFixtures(prisma: PrismaService, tenantIds: string[]) {
  await prisma.auditEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.usageEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.executionRequest.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.pulseActionExecution.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.pulseOperationalEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.pulseTicket.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.pulseConversation.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.pulseChannel.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
}

export async function seedTwoTenants(prisma: PrismaService, ids: ReturnType<typeof databaseFixtureIds>) {
  await prisma.tenant.createMany({
    data: [
      { id: ids.tenantA, name: 'DB Fixture Tenant A', slug: ids.slugA, status: 'ACTIVE' },
      { id: ids.tenantB, name: 'DB Fixture Tenant B', slug: ids.slugB, status: 'ACTIVE' },
    ],
  });
}
