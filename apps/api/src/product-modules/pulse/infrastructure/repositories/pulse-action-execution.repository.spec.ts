import { PulseActionExecutionStatus } from '@prisma/client';
import { PulseActionExecutionRepository } from './pulse-action-execution.repository';

describe('PulseActionExecutionRepository', () => {
  const prisma = {
    pulseActionExecution: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('claims a new action execution with tenant-scoped idempotency', async () => {
    prisma.pulseActionExecution.create.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-1',
      action: 'advance_flow_state',
      idempotencyKey: 'action-key',
      ticketId: 'ticket-1',
      conversationId: null,
      status: PulseActionExecutionStatus.STARTED,
      attempts: 1,
      metadata: {},
      errorMessage: null,
    });
    const repository = new PulseActionExecutionRepository(prisma as never);

    await expect(repository.begin({
      tenantId: 'tenant-1',
      action: 'advance_flow_state',
      idempotencyKey: 'action-key',
      ticketId: 'ticket-1',
    })).resolves.toEqual(expect.objectContaining({ state: 'claimed' }));

    expect(prisma.pulseActionExecution.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        idempotencyKey: 'action-key',
      }),
    }));
  });

  it('returns already_succeeded for duplicate completed executions', async () => {
    prisma.pulseActionExecution.create.mockRejectedValue({ code: 'P2002' });
    prisma.pulseActionExecution.findUniqueOrThrow.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-1',
      action: 'advance_flow_state',
      idempotencyKey: 'action-key',
      ticketId: 'ticket-1',
      conversationId: null,
      status: PulseActionExecutionStatus.SUCCEEDED,
      attempts: 1,
      metadata: {},
      errorMessage: null,
    });
    const repository = new PulseActionExecutionRepository(prisma as never);

    await expect(repository.begin({
      tenantId: 'tenant-1',
      action: 'advance_flow_state',
      idempotencyKey: 'action-key',
      ticketId: 'ticket-1',
    })).resolves.toEqual(expect.objectContaining({ state: 'already_succeeded' }));
  });

  it('restarts failed executions for retry', async () => {
    prisma.pulseActionExecution.create.mockRejectedValue({ code: 'P2002' });
    prisma.pulseActionExecution.findUniqueOrThrow.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-1',
      action: 'advance_flow_state',
      idempotencyKey: 'action-key',
      ticketId: 'ticket-1',
      conversationId: null,
      status: PulseActionExecutionStatus.FAILED,
      attempts: 1,
      metadata: { previous: true },
      errorMessage: 'first failure',
    });
    prisma.pulseActionExecution.update.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-1',
      action: 'advance_flow_state',
      idempotencyKey: 'action-key',
      ticketId: 'ticket-1',
      conversationId: null,
      status: PulseActionExecutionStatus.STARTED,
      attempts: 2,
      metadata: { previous: true, retry: true },
      errorMessage: null,
    });
    const repository = new PulseActionExecutionRepository(prisma as never);

    await expect(repository.begin({
      tenantId: 'tenant-1',
      action: 'advance_flow_state',
      idempotencyKey: 'action-key',
      ticketId: 'ticket-1',
      metadata: { retry: true },
    })).resolves.toEqual(expect.objectContaining({ state: 'claimed' }));

    expect(prisma.pulseActionExecution.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: PulseActionExecutionStatus.STARTED,
        attempts: { increment: 1 },
      }),
    }));
  });
});
