import { PulseTicketStatus, PulseTicketType } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  databaseFixtureIds,
  describeDatabase,
  resetTenantFixtures,
  seedTwoTenants,
} from '../../../../testing/database-fixtures';
import { PulseTicketRepository } from './pulse-ticket.repository';

describeDatabase('Pulse RLS database fixtures', () => {
  const ids = databaseFixtureIds('pulse-rls');
  const tenantIds = [ids.tenantA, ids.tenantB];

  let prisma: PrismaService;
  let connected = false;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    connected = true;
    await resetTenantFixtures(prisma, tenantIds);
    await seedTwoTenants(prisma, ids);
  });

  afterAll(async () => {
    if (connected) {
      await resetTenantFixtures(prisma, tenantIds);
      await prisma.$disconnect();
    }
  });

  it('enforces tenant visibility on pulse tickets through database RLS', async () => {
    const repository = new PulseTicketRepository(prisma);
    const ticket = await repository.create({
      tenantId: ids.tenantA,
      type: PulseTicketType.SUPPORT,
      status: PulseTicketStatus.OPEN,
      title: 'Tenant A RLS ticket',
      metadata: { fixture: 'rls' },
    });

    await expect(repository.findById(ids.tenantA, ticket.id)).resolves.toEqual(
      expect.objectContaining({ id: ticket.id, tenantId: ids.tenantA }),
    );
    await expect(repository.findById(ids.tenantB, ticket.id)).resolves.toBeNull();

    await expect(
      prisma.pulseTicket.findFirst({
        where: { id: ticket.id },
      }),
    ).resolves.toBeNull();

    await expect(
      prisma.withTenantContext(ids.tenantA, (tx) =>
        tx.pulseTicket.create({
          data: {
            tenantId: ids.tenantB,
            type: PulseTicketType.SUPPORT,
            status: PulseTicketStatus.OPEN,
            title: 'Tenant B ticket through Tenant A context',
          },
        }),
      ),
    ).rejects.toThrow();
  });
});
