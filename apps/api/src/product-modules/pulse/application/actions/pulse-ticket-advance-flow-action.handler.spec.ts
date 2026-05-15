import { BadRequestException } from '@nestjs/common';
import { PulseTicketAdvanceFlowActionHandler } from './pulse-ticket-advance-flow-action.handler';

describe('PulseTicketAdvanceFlowActionHandler', () => {
  const tickets = {
    advanceFlowState: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('advances ticket flow with tenant scope and actor metadata', async () => {
    tickets.advanceFlowState.mockResolvedValue({
      id: 'ticket-1',
      status: 'OPEN',
      confidence: 0.9,
      priority: 10,
    });
    const handler = new PulseTicketAdvanceFlowActionHandler(tickets as never);

    await expect(handler.execute({
      tenantId: 'tenant-1',
      idempotencyKey: 'idem-1',
      requestedAt: '2026-05-09T12:00:00.000Z',
      action: 'ticket.advance_flow',
      ticketId: 'ticket-1',
      payload: {
        actor: {
          userId: 'user-1',
          email: 'operator@example.com',
          role: 'tenant_operator',
        },
        nextState: 'collect_context',
        transitionSource: 'ai',
        confidence: 0.9,
        note: 'Runtime recommended collecting more context.',
      },
    })).resolves.toEqual({
      sideEffectsApplied: true,
      result: {
        ticketId: 'ticket-1',
        status: 'OPEN',
        confidence: 0.9,
        priority: 10,
      },
    });

    expect(tickets.advanceFlowState).toHaveBeenCalledWith(
      'tenant-1',
      'ticket-1',
      {
        sub: 'user-1',
        email: 'operator@example.com',
        role: 'tenant_operator',
      },
      {
        nextState: 'collect_context',
        transitionSource: 'ai',
        confidence: 0.9,
        note: 'Runtime recommended collecting more context.',
        aiDecisionSummary: undefined,
        actionIdempotencyKey: 'idem-1',
      },
    );
  });

  it('rejects missing actor metadata before mutating tickets', async () => {
    const handler = new PulseTicketAdvanceFlowActionHandler(tickets as never);

    await expect(handler.execute({
      tenantId: 'tenant-1',
      idempotencyKey: 'idem-1',
      requestedAt: '2026-05-09T12:00:00.000Z',
      action: 'ticket.advance_flow',
      ticketId: 'ticket-1',
      payload: {
        nextState: 'collect_context',
      },
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(tickets.advanceFlowState).not.toHaveBeenCalled();
  });

  it('rejects unsupported payload fields before mutating tickets', async () => {
    const handler = new PulseTicketAdvanceFlowActionHandler(tickets as never);

    await expect(handler.execute({
      tenantId: 'tenant-1',
      idempotencyKey: 'idem-1',
      requestedAt: '2026-05-09T12:00:00.000Z',
      action: 'ticket.advance_flow',
      ticketId: 'ticket-1',
      payload: {
        actor: {
          userId: 'user-1',
          email: 'operator@example.com',
          role: 'tenant_operator',
        },
        nextState: 'collect_context',
        rawProviderPayload: { unsafe: true },
      },
    })).rejects.toThrow('unsupported field');

    expect(tickets.advanceFlowState).not.toHaveBeenCalled();
  });
});
