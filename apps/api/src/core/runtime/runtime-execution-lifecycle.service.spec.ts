import { ExecutionStatus } from '@prisma/client';
import { AuditAction } from '../../common/audit/audit.service';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';

function createPrismaMock() {
  return {
    executionRequest: {
      create: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('RuntimeExecutionLifecycleService', () => {
  const audit = { record: jest.fn() };

  beforeEach(() => {
    audit.record.mockReset();
  });

  it('creates tenant-aware execution requests with idempotency', async () => {
    const prisma = createPrismaMock();
    prisma.executionRequest.upsert.mockResolvedValue({
      id: 'exec-1',
      context: { tenantId: 'tenant-a', moduleSlug: 'pulse' },
      requestType: 'pulse.flow.advance',
      idempotencyKey: 'idem-1',
      input: { ticketId: 'ticket-1' },
      requestedAt: new Date('2026-05-08T10:00:00.000Z'),
    });
    const service = new RuntimeExecutionLifecycleService(prisma as never, audit as never);

    const result = await service.request({
      context: { tenantId: 'tenant-a', moduleSlug: 'pulse' },
      requestType: 'pulse.flow.advance',
      idempotencyKey: 'idem-1',
      input: { ticketId: 'ticket-1' },
    });

    expect(prisma.executionRequest.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_idempotencyKey: {
          tenantId: 'tenant-a',
          idempotencyKey: 'idem-1',
        },
      },
      create: expect.objectContaining({
        tenantId: 'tenant-a',
        moduleSlug: 'pulse',
        requestType: 'pulse.flow.advance',
        status: ExecutionStatus.REQUESTED,
      }),
      update: {},
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        action: AuditAction.RUNTIME_EXECUTION_REQUESTED,
        resourceType: 'ExecutionRequest',
        resourceId: 'exec-1',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'exec-1',
        requestType: 'pulse.flow.advance',
        requestedAt: '2026-05-08T10:00:00.000Z',
      }),
    );
  });

  it('transitions tenant-owned execution requests and timestamps terminal states', async () => {
    const prisma = createPrismaMock();
    prisma.executionRequest.findFirst.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-a',
      moduleSlug: 'pulse',
      status: ExecutionStatus.RUNNING,
      output: null,
      errorMessage: null,
      startedAt: new Date('2026-05-08T10:01:00.000Z'),
      completedAt: null,
    });
    prisma.executionRequest.update.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-a',
      moduleSlug: 'pulse',
      status: ExecutionStatus.SUCCEEDED,
      output: { ok: true },
      errorMessage: null,
      startedAt: null,
      completedAt: new Date('2026-05-08T10:05:00.000Z'),
    });
    const service = new RuntimeExecutionLifecycleService(prisma as never, audit as never);

    const result = await service.transition({
      tenantId: 'tenant-a',
      executionId: 'exec-1',
      status: ExecutionStatus.SUCCEEDED,
      actorUserId: 'user-1',
      output: { ok: true },
    });

    expect(prisma.executionRequest.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', id: 'exec-1' },
    });
    expect(prisma.executionRequest.update).toHaveBeenCalledWith({
      where: { id: 'exec-1' },
      data: expect.objectContaining({
        status: ExecutionStatus.SUCCEEDED,
        output: { ok: true },
        completedAt: expect.any(Date),
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        actorUserId: 'user-1',
        action: AuditAction.RUNTIME_EXECUTION_TRANSITIONED,
        resourceId: 'exec-1',
        metadata: expect.objectContaining({
          fromStatus: ExecutionStatus.RUNNING,
          toStatus: ExecutionStatus.SUCCEEDED,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'exec-1',
        tenantId: 'tenant-a',
        status: ExecutionStatus.SUCCEEDED,
      }),
    );
  });

  it('loads tenant-scoped execution requests with original input context', async () => {
    const prisma = createPrismaMock();
    prisma.executionRequest.findFirst.mockResolvedValue({
      id: 'exec-1',
      context: { tenantId: 'tenant-a', moduleSlug: 'pulse' },
      requestType: 'pulse.advance_flow',
      idempotencyKey: 'idem-1',
      input: { contextPack: { module: 'pulse' } },
      requestedAt: new Date('2026-05-08T10:00:00.000Z'),
    });
    const service = new RuntimeExecutionLifecycleService(prisma as never, audit as never);

    await expect(service.getRequest('tenant-a', 'exec-1')).resolves.toEqual({
      id: 'exec-1',
      context: { tenantId: 'tenant-a', moduleSlug: 'pulse' },
      requestType: 'pulse.advance_flow',
      idempotencyKey: 'idem-1',
      input: { contextPack: { module: 'pulse' } },
      requestedAt: '2026-05-08T10:00:00.000Z',
    });
    expect(prisma.executionRequest.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', id: 'exec-1' },
    });
  });

  it('rejects invalid lifecycle transitions before updates or audit writes', async () => {
    const prisma = createPrismaMock();
    prisma.executionRequest.findFirst.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-a',
      moduleSlug: 'pulse',
      status: ExecutionStatus.SUCCEEDED,
      output: null,
      errorMessage: null,
      startedAt: null,
      completedAt: new Date('2026-05-08T10:05:00.000Z'),
    });
    const service = new RuntimeExecutionLifecycleService(prisma as never, audit as never);

    await expect(
      service.transition({
        tenantId: 'tenant-a',
        executionId: 'exec-1',
        status: ExecutionStatus.RUNNING,
      }),
    ).rejects.toThrow('Invalid runtime execution transition');

    expect(prisma.executionRequest.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('masks sensitive input and output payload fields before persistence', async () => {
    const prisma = createPrismaMock();
    prisma.executionRequest.create.mockResolvedValue({
      id: 'exec-1',
      context: { tenantId: 'tenant-a', moduleSlug: 'pulse', metadata: { apiKey: '[REDACTED]' } },
      requestType: 'pulse.flow.advance',
      idempotencyKey: null,
      input: { nested: { token: '[REDACTED]', value: 'safe' } },
      requestedAt: new Date('2026-05-08T10:00:00.000Z'),
    });
    const service = new RuntimeExecutionLifecycleService(prisma as never, audit as never);

    await service.request({
      context: { tenantId: 'tenant-a', moduleSlug: 'pulse', metadata: { apiKey: 'secret' } },
      requestType: 'pulse.flow.advance',
      input: { nested: { token: 'secret-token', value: 'safe' } },
    });

    expect(prisma.executionRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        context: { tenantId: 'tenant-a', moduleSlug: 'pulse', metadata: { apiKey: '[REDACTED]' } },
        input: { nested: { token: '[REDACTED]', value: 'safe' } },
      }),
    });
  });

  it('cancels through the lifecycle path with dedicated audit metadata', async () => {
    const prisma = createPrismaMock();
    prisma.executionRequest.findFirst.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-a',
      moduleSlug: 'pulse',
      status: ExecutionStatus.QUEUED,
      output: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    });
    prisma.executionRequest.update.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-a',
      moduleSlug: 'pulse',
      status: ExecutionStatus.CANCELLED,
      output: null,
      errorMessage: 'operator requested',
      startedAt: null,
      completedAt: new Date('2026-05-08T10:05:00.000Z'),
    });
    const service = new RuntimeExecutionLifecycleService(prisma as never, audit as never);

    await service.cancel({
      tenantId: 'tenant-a',
      executionId: 'exec-1',
      actorUserId: 'user-1',
      reason: 'operator requested',
    });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.RUNTIME_EXECUTION_CANCELLED,
        tenantId: 'tenant-a',
        actorUserId: 'user-1',
        resourceId: 'exec-1',
      }),
    );
  });
});
