import { IntegrationProvider, IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PulseIntegrationSettingRepository } from './pulse-integration-setting.repository';

function createPrismaMock() {
  return {
    integrationSetting: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
}

describe('PulseIntegrationSettingRepository', () => {
  it('lists tenant-scoped scheduling integrations without exposing credential refs', async () => {
    const prisma = createPrismaMock();
    prisma.integrationSetting.findMany.mockResolvedValue([
      {
        id: 'integration-1',
        tenantId: 'tenant-a',
        provider: IntegrationProvider.GOOGLE_CALENDAR,
        status: IntegrationStatus.ACTIVE,
        displayName: 'Primary calendar',
        externalRef: 'calendar-1',
        settings: {},
        credentialsRef: 'secret-ref',
        metadata: {},
        createdAt: new Date('2026-05-08T10:00:00.000Z'),
        updatedAt: new Date('2026-05-08T10:00:00.000Z'),
      },
    ]);
    prisma.integrationSetting.count.mockResolvedValue(1);
    const repository = new PulseIntegrationSettingRepository(
      prisma as unknown as PrismaService,
    );

    const result = await repository.list('tenant-a', {
      provider: IntegrationProvider.GOOGLE_CALENDAR,
      status: IntegrationStatus.ACTIVE,
    });

    expect(prisma.integrationSetting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-a',
          provider: IntegrationProvider.GOOGLE_CALENDAR,
          status: IntegrationStatus.ACTIVE,
        },
      }),
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        credentialsConfigured: true,
      }),
    );
    expect(result.data[0]).not.toHaveProperty('credentialsRef');
  });

  it('finds integrations by tenant and id', async () => {
    const prisma = createPrismaMock();
    prisma.integrationSetting.findFirst.mockResolvedValue(null);
    const repository = new PulseIntegrationSettingRepository(
      prisma as unknown as PrismaService,
    );

    await repository.findById('tenant-a', 'integration-1');

    expect(prisma.integrationSetting.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-a', id: 'integration-1' },
      }),
    );
  });
});
