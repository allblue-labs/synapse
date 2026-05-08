import {
  PulseKnowledgeContextStatus,
  PulseKnowledgeContextType,
} from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PulseKnowledgeContextRepository } from './pulse-knowledge-context.repository';

function createPrismaMock() {
  return {
    pulseKnowledgeContext: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
}

describe('PulseKnowledgeContextRepository', () => {
  it('lists tenant-scoped knowledge contexts with type/status/query filters', async () => {
    const prisma = createPrismaMock();
    prisma.pulseKnowledgeContext.findMany.mockResolvedValue([]);
    prisma.pulseKnowledgeContext.count.mockResolvedValue(0);
    const repository = new PulseKnowledgeContextRepository(
      prisma as unknown as PrismaService,
    );

    await repository.list('tenant-a', {
      page: 2,
      pageSize: 10,
      type: PulseKnowledgeContextType.FAQ,
      status: PulseKnowledgeContextStatus.ACTIVE,
      query: 'hours',
    });

    expect(prisma.pulseKnowledgeContext.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-a',
          type: PulseKnowledgeContextType.FAQ,
          status: PulseKnowledgeContextStatus.ACTIVE,
          OR: [
            { title: { contains: 'hours', mode: 'insensitive' } },
            { content: { contains: 'hours', mode: 'insensitive' } },
          ],
        },
        skip: 10,
        take: 10,
      }),
    );
    expect(prisma.pulseKnowledgeContext.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a',
        type: PulseKnowledgeContextType.FAQ,
        status: PulseKnowledgeContextStatus.ACTIVE,
        OR: [
          { title: { contains: 'hours', mode: 'insensitive' } },
          { content: { contains: 'hours', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('publishes active tenant-scoped knowledge contexts', async () => {
    const prisma = createPrismaMock();
    const repository = new PulseKnowledgeContextRepository(
      prisma as unknown as PrismaService,
    );

    await repository.publish({
      tenantId: 'tenant-a',
      type: PulseKnowledgeContextType.OPERATIONAL_INSTRUCTION,
      title: 'Escalation policy',
      content: 'Escalate scheduling conflicts.',
      metadata: { source: 'operator' },
    });

    expect(prisma.pulseKnowledgeContext.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          tenantId: 'tenant-a',
          type: PulseKnowledgeContextType.OPERATIONAL_INSTRUCTION,
          title: 'Escalation policy',
          content: 'Escalate scheduling conflicts.',
          status: PulseKnowledgeContextStatus.ACTIVE,
          metadata: { source: 'operator' },
        },
      }),
    );
  });

  it('archives only after tenant-scoped lookup succeeds', async () => {
    const prisma = createPrismaMock();
    prisma.pulseKnowledgeContext.findFirst.mockResolvedValue({
      id: 'knowledge-1',
      tenantId: 'tenant-a',
    });
    const repository = new PulseKnowledgeContextRepository(
      prisma as unknown as PrismaService,
    );

    await repository.archive('tenant-a', 'knowledge-1');

    expect(prisma.pulseKnowledgeContext.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-a', id: 'knowledge-1' },
      }),
    );
    expect(prisma.pulseKnowledgeContext.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'knowledge-1' },
        data: { status: PulseKnowledgeContextStatus.ARCHIVED },
      }),
    );
  });

  it('does not archive cross-tenant knowledge contexts', async () => {
    const prisma = createPrismaMock();
    prisma.pulseKnowledgeContext.findFirst.mockResolvedValue(null);
    const repository = new PulseKnowledgeContextRepository(
      prisma as unknown as PrismaService,
    );

    const result = await repository.archive('tenant-a', 'knowledge-b');

    expect(result).toBeNull();
    expect(prisma.pulseKnowledgeContext.update).not.toHaveBeenCalled();
  });
});
