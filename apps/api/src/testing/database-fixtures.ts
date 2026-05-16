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
  await prisma.withTenantContext(
    tenantIds[0] ?? 'fixture-platform-bypass',
    async (tx) => {
      await tx.auditEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.usageEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.executionRequest.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.pulseActionExecution.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.pulseOperationalEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.pulseTicket.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.pulseConversation.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.pulseChannel.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.pulseOperationalSchedule.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.pulseKnowledgeContext.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.pulseSkill.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.integrationSetting.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    },
    { platformBypass: true },
  );
}

export async function seedTwoTenants(prisma: PrismaService, ids: ReturnType<typeof databaseFixtureIds>) {
  await prisma.tenant.createMany({
    data: [
      { id: ids.tenantA, name: 'DB Fixture Tenant A', slug: ids.slugA, status: 'ACTIVE' },
      { id: ids.tenantB, name: 'DB Fixture Tenant B', slug: ids.slugB, status: 'ACTIVE' },
    ],
  });
}
