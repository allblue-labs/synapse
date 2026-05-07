import { PulseChannelProvider, PulseChannelStatus } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PulseChannelRepository } from './pulse-channel.repository';

function createPrismaMock() {
  return {
    pulseChannel: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
}

describe('PulseChannelRepository', () => {
  it('finds channels using tenant and id filters', async () => {
    const prisma = createPrismaMock();
    prisma.pulseChannel.findFirst.mockResolvedValue({
      id: 'channel_1',
      tenantId: 'tenant_a',
      provider: PulseChannelProvider.WHATSAPP,
      identifier: '+15550001111',
      status: PulseChannelStatus.ACTIVE,
    });
    const repository = new PulseChannelRepository(prisma as unknown as PrismaService);

    await repository.findById('tenant_a', 'channel_1');

    expect(prisma.pulseChannel.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_a', id: 'channel_1' },
      select: {
        id: true,
        tenantId: true,
        provider: true,
        identifier: true,
        status: true,
      },
    });
  });

  it('lists channels using tenant filters', async () => {
    const prisma = createPrismaMock();
    prisma.pulseChannel.findMany.mockResolvedValue([]);
    prisma.pulseChannel.count.mockResolvedValue(0);
    const repository = new PulseChannelRepository(prisma as unknown as PrismaService);

    await repository.list('tenant_a', {
      page: 2,
      pageSize: 10,
      provider: PulseChannelProvider.WHATSAPP,
      status: PulseChannelStatus.ACTIVE,
    });

    expect(prisma.pulseChannel.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        provider: PulseChannelProvider.WHATSAPP,
        status: PulseChannelStatus.ACTIVE,
      },
      select: {
        id: true,
        tenantId: true,
        provider: true,
        identifier: true,
        status: true,
      },
      orderBy: [{ provider: 'asc' }, { identifier: 'asc' }],
      skip: 10,
      take: 10,
    });
    expect(prisma.pulseChannel.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        provider: PulseChannelProvider.WHATSAPP,
        status: PulseChannelStatus.ACTIVE,
      },
    });
  });

  it('upserts channels with tenant/provider/identifier uniqueness', async () => {
    const prisma = createPrismaMock();
    prisma.pulseChannel.upsert.mockResolvedValue({
      id: 'channel_1',
      tenantId: 'tenant_a',
      provider: PulseChannelProvider.WHATSAPP,
      identifier: '+15550001111',
      status: PulseChannelStatus.ACTIVE,
    });
    const repository = new PulseChannelRepository(prisma as unknown as PrismaService);

    await repository.upsert({
      tenantId: 'tenant_a',
      provider: PulseChannelProvider.WHATSAPP,
      identifier: '+15550001111',
      metadata: { label: 'Main number' },
    });

    expect(prisma.pulseChannel.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_provider_identifier: {
          tenantId: 'tenant_a',
          provider: PulseChannelProvider.WHATSAPP,
          identifier: '+15550001111',
        },
      },
      create: expect.objectContaining({
        tenantId: 'tenant_a',
        provider: PulseChannelProvider.WHATSAPP,
        identifier: '+15550001111',
        status: PulseChannelStatus.ACTIVE,
      }),
      update: expect.objectContaining({
        status: PulseChannelStatus.ACTIVE,
        metadata: { label: 'Main number' },
      }),
      select: {
        id: true,
        tenantId: true,
        provider: true,
        identifier: true,
        status: true,
      },
    });
  });
});
