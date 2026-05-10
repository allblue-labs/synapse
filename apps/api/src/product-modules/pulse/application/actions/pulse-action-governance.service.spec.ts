import { ForbiddenException } from '@nestjs/common';
import { PulseActionGovernanceService } from './pulse-action-governance.service';

describe('PulseActionGovernanceService', () => {
  const queues = {
    enqueueAction: jest.fn(),
  };
  const handlers = {
    definition: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    handlers.definition.mockImplementation((action) => (
      action === 'ticket.advance_flow'
        ? {
          action: 'ticket.advance_flow',
          permissions: ['tickets:write'],
          validationFailureClass: 'non_retryable_validation',
        }
        : null
    ));
  });

  it('enqueues governed actions with actor metadata and permission snapshot', async () => {
    queues.enqueueAction.mockResolvedValue({ id: 'job-1' });
    const service = new PulseActionGovernanceService(queues as never, handlers as never);

    await service.enqueue({
      tenantId: 'tenant-1',
      action: 'ticket.advance_flow',
      ticketId: 'ticket-1',
      payload: {
        nextState: 'collect_context',
      },
      actor: {
        userId: 'user-1',
        email: 'operator@example.com',
        role: 'tenant_operator',
        permissions: ['tickets:write'],
      },
    });

    expect(queues.enqueueAction).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      action: 'ticket.advance_flow',
      ticketId: 'ticket-1',
      payload: {
        nextState: 'collect_context',
        actor: {
          userId: 'user-1',
          email: 'operator@example.com',
          role: 'tenant_operator',
        },
      },
      actor: {
        userId: 'user-1',
        email: 'operator@example.com',
        role: 'tenant_operator',
        permissions: ['tickets:write'],
      },
      idempotencyKey: 'pulse.actions:tenant-1:ticket.advance_flow:ticket-1',
    });
  });

  it('rejects missing permission snapshots before enqueueing', async () => {
    const service = new PulseActionGovernanceService(queues as never, handlers as never);

    await expect(service.enqueue({
      tenantId: 'tenant-1',
      action: 'ticket.advance_flow',
      ticketId: 'ticket-1',
      payload: { nextState: 'collect_context' },
      actor: {
        userId: 'user-1',
        email: 'operator@example.com',
        role: 'tenant_viewer',
        permissions: ['tickets:read'],
      },
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(queues.enqueueAction).not.toHaveBeenCalled();
  });

  it('rejects actions without enqueue governance rules', async () => {
    const service = new PulseActionGovernanceService(queues as never, handlers as never);

    await expect(service.enqueue({
      tenantId: 'tenant-1',
      action: 'provider.delete_all_data',
      payload: {},
      actor: {
        userId: 'user-1',
        email: 'operator@example.com',
        role: 'tenant_owner',
        permissions: ['tickets:write'],
      },
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(queues.enqueueAction).not.toHaveBeenCalled();
  });
});
