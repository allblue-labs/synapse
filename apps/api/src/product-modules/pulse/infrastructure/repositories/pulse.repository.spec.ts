import { NotFoundException } from '@nestjs/common';
import { PulseStatus } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PulseRepository } from './pulse.repository';

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry_1',
    tenantId: 'tenant_a',
    conversationId: null,
    status: PulseStatus.PROCESSING,
    originalMessage: 'Need appointment tomorrow',
    transcription: null,
    mediaUrl: null,
    contactPhone: '+15551234567',
    contactName: 'Ada',
    extractedData: null,
    confidence: null,
    aiSummary: null,
    scheduledAt: null,
    errorMessage: null,
    retryCount: 0,
    processingLogs: [],
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    ...overrides,
  };
}

function createPrismaMock() {
  return {
    pulseEntry: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('PulseRepository tenant isolation', () => {
  it('scopes findById by id and tenantId', async () => {
    const prisma = createPrismaMock();
    prisma.pulseEntry.findFirst.mockResolvedValue(createRecord());
    const repository = new PulseRepository(prisma as unknown as PrismaService);

    await repository.findById('tenant_a', 'entry_1');

    expect(prisma.pulseEntry.findFirst).toHaveBeenCalledWith({
      where: { id: 'entry_1', tenantId: 'tenant_a' },
    });
  });

  it('scopes list queries and counts by tenantId', async () => {
    const prisma = createPrismaMock();
    const record = createRecord();
    prisma.pulseEntry.findMany.mockReturnValue('findManyPromise');
    prisma.pulseEntry.count.mockReturnValue('countPromise');
    prisma.$transaction.mockResolvedValue([[record], 1]);
    const repository = new PulseRepository(prisma as unknown as PrismaService);

    const result = await repository.list('tenant_a', {
      status: PulseStatus.PENDING_VALIDATION,
      page: 2,
      pageSize: 10,
    });

    expect(prisma.pulseEntry.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_a', status: PulseStatus.PENDING_VALIDATION },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(prisma.pulseEntry.count).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_a', status: PulseStatus.PENDING_VALIDATION },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(['findManyPromise', 'countPromise']);
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10 });
  });

  it('scopes updates by id and tenantId before reading back the record', async () => {
    const prisma = createPrismaMock();
    prisma.pulseEntry.updateMany.mockResolvedValue({ count: 1 });
    prisma.pulseEntry.findFirstOrThrow.mockResolvedValue(
      createRecord({ status: PulseStatus.FAILED, errorMessage: 'bad input' }),
    );
    const repository = new PulseRepository(prisma as unknown as PrismaService);

    await repository.update('tenant_a', 'entry_1', {
      status: PulseStatus.FAILED,
      errorMessage: 'bad input',
    });

    expect(prisma.pulseEntry.updateMany).toHaveBeenCalledWith({
      where: { id: 'entry_1', tenantId: 'tenant_a' },
      data: { status: PulseStatus.FAILED, errorMessage: 'bad input' },
    });
    expect(prisma.pulseEntry.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: 'entry_1', tenantId: 'tenant_a' },
    });
  });

  it('throws when an update does not match the tenant scope', async () => {
    const prisma = createPrismaMock();
    prisma.pulseEntry.updateMany.mockResolvedValue({ count: 0 });
    const repository = new PulseRepository(prisma as unknown as PrismaService);

    await expect(
      repository.update('tenant_a', 'entry_from_tenant_b', {
        status: PulseStatus.FAILED,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.pulseEntry.findFirstOrThrow).not.toHaveBeenCalled();
  });

  it('creates entries with the caller tenantId only', async () => {
    const prisma = createPrismaMock();
    prisma.pulseEntry.create.mockResolvedValue(createRecord());
    const repository = new PulseRepository(prisma as unknown as PrismaService);

    await repository.create({
      tenantId: 'tenant_a',
      contactPhone: '+15551234567',
      originalMessage: 'Need appointment tomorrow',
    });

    expect(prisma.pulseEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant_a',
        contactPhone: '+15551234567',
        originalMessage: 'Need appointment tomorrow',
        status: PulseStatus.PROCESSING,
      }),
    });
  });
});
