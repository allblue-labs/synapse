import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PulseActionExecutionStatus, PulseTicketStatus, PulseTicketType } from '@prisma/client';
import { TicketLifecycleUseCase } from './ticket-lifecycle.use-case';

const actor = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  role: 'OPERATOR' as const,
  email: 'operator@synapse.local',
};

const baseTicket = {
  id: 'ticket-1',
  tenantId: 'tenant-1',
  conversationId: 'conversation-1',
  type: PulseTicketType.SUPPORT,
  status: PulseTicketStatus.OPEN,
  assignedUserId: null,
  confidence: 0.42,
  metadata: {},
  priority: 0,
  resolvedAt: null,
};

describe('TicketLifecycleUseCase', () => {
  const tickets = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const events = { record: jest.fn() };
  const tx = {
    pulseTicket: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    pulseActionExecution: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    pulseOperationalEvent: {
      create: jest.fn(),
    },
    auditEvent: {
      create: jest.fn(),
    },
    usageEvent: {
      upsert: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    withTenantContext: jest.fn((_tenantId: string, callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const audit = { record: jest.fn() };
  const usage = { record: jest.fn() };

  const useCase = new TicketLifecycleUseCase(
    tickets as never,
    events as never,
    audit as never,
    usage as never,
    prisma as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tickets.findById.mockResolvedValue(baseTicket);
    tickets.update.mockImplementation((_tenantId, _id, input) => ({
      ...baseTicket,
      ...input,
      metadata: input.metadata ?? baseTicket.metadata,
    }));
    tx.pulseTicket.findFirst.mockResolvedValue(baseTicket);
    tx.pulseTicket.update.mockImplementation(({ data }) => ({
      ...baseTicket,
      ...data,
      metadata: data.metadata ?? baseTicket.metadata,
    }));
    tx.pulseActionExecution.upsert.mockResolvedValue({
      status: PulseActionExecutionStatus.STARTED,
      attempts: 1,
    });
    tx.pulseActionExecution.update.mockResolvedValue({});
    tx.pulseOperationalEvent.create.mockResolvedValue({});
    tx.auditEvent.create.mockResolvedValue({});
    tx.usageEvent.upsert.mockResolvedValue({});
    prisma.withTenantContext.mockImplementation((_tenantId: string, callback: (client: typeof tx) => unknown) =>
      callback(tx)
    );
  });

  it('assigns a ticket and emits operational and audit events', async () => {
    const result = await useCase.assignTicket('tenant-1', 'ticket-1', actor, {
      assignedUserId: 'user-2',
      note: 'Needs senior review',
    });

    expect(result.assignedUserId).toBe('user-2');
    expect(tickets.update).toHaveBeenCalledWith(
      'tenant-1',
      'ticket-1',
      expect.objectContaining({
        assignedUserId: 'user-2',
      }),
    );
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        eventType: 'pulse.ticket.assign_ticket',
        actorUserId: 'user-1',
        conversationId: 'conversation-1',
        ticketId: 'ticket-1',
        metadata: expect.objectContaining({
          usageCandidate: 'ticket_operation',
        }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'pulse.ticket.assign_ticket',
        resourceType: 'PulseTicket',
        resourceId: 'ticket-1',
      }),
    );
    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        moduleSlug: 'pulse',
        metricType: 'WORKFLOW_RUN',
        unit: 'ticket_operation',
        resourceType: 'PulseTicket',
        resourceId: 'ticket-1',
        idempotencyKey: 'pulse-ticket-assign_ticket:ticket-1',
      }),
    );
  });

  it('resolves a ticket as a terminal operational state', async () => {
    await useCase.resolveTicket('tenant-1', 'ticket-1', actor, {
      resolutionSummary: 'Handled by operator.',
    });

    expect(tickets.update).toHaveBeenCalledWith(
      'tenant-1',
      'ticket-1',
      expect.objectContaining({
        status: PulseTicketStatus.RESOLVED,
        resolvedAt: expect.any(Date),
      }),
    );
  });

  it('rejects terminal-state mutation attempts', async () => {
    tickets.findById.mockResolvedValue({
      ...baseTicket,
      status: PulseTicketStatus.RESOLVED,
    });

    await expect(
      useCase.escalateTicket('tenant-1', 'ticket-1', actor, { reason: 'Too risky' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tickets.update).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
  });

  it('reopens resolved tickets', async () => {
    tickets.findById.mockResolvedValue({
      ...baseTicket,
      status: PulseTicketStatus.RESOLVED,
      resolvedAt: new Date('2026-05-08T10:00:00.000Z'),
    });

    await useCase.reopenTicket('tenant-1', 'ticket-1', actor, { reason: 'Customer replied' });

    expect(tickets.update).toHaveBeenCalledWith(
      'tenant-1',
      'ticket-1',
      expect.objectContaining({
        status: PulseTicketStatus.OPEN,
        resolvedAt: null,
      }),
    );
  });

  it('stores audit-safe operator review event payloads', async () => {
    await useCase.submitOperatorReview('tenant-1', 'ticket-1', actor, {
      summary: 'AI extraction looked correct.',
      confidence: 0.91,
      decision: {
        approved: true,
        providerToken: 'do-not-store',
      },
    });

    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pulse.ticket.submit_operator_review',
        payload: expect.objectContaining({
          data: expect.objectContaining({
            decision: expect.objectContaining({
              providerToken: '[REDACTED]',
            }),
          }),
        }),
      }),
    );
  });

  it('advances flow state through ticket metadata', async () => {
    await useCase.advanceFlowState('tenant-1', 'ticket-1', actor, {
      nextState: 'intake',
      transitionSource: 'manual',
      confidence: 0.88,
      actionIdempotencyKey: 'pulse.actions:tenant-1:exec-1:ticket.advance_flow:ticket-1',
    });

    expect(tx.pulseTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          confidence: 0.88,
          metadata: expect.objectContaining({
            flowState: 'intake',
            flowTransition: expect.objectContaining({
              nextState: 'intake',
              source: 'manual',
              actionIdempotencyKey: 'pulse.actions:tenant-1:exec-1:ticket.advance_flow:ticket-1',
            }),
            actionIdempotencyKeys: expect.objectContaining({
              'pulse.actions:tenant-1:exec-1:ticket.advance_flow:ticket-1': expect.objectContaining({
                action: 'advance_flow_state',
                eventType: 'pulse.ticket.advance_flow_state',
              }),
            }),
          }),
        }),
      }),
    );
    expect(tx.pulseActionExecution.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        tenantId: 'tenant-1',
        action: 'advance_flow_state',
        idempotencyKey: 'pulse.actions:tenant-1:exec-1:ticket.advance_flow:ticket-1',
        ticketId: 'ticket-1',
        conversationId: 'conversation-1',
      }),
    }));
    expect(tx.pulseActionExecution.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: PulseActionExecutionStatus.SUCCEEDED,
      }),
    }));
  });

  it('does not reapply an already succeeded action execution key', async () => {
    tx.pulseActionExecution.upsert.mockResolvedValue({
      status: PulseActionExecutionStatus.SUCCEEDED,
      attempts: 2,
    });

    await expect(useCase.advanceFlowState('tenant-1', 'ticket-1', actor, {
      nextState: 'collect_context',
      transitionSource: 'ai',
      confidence: 0.91,
      actionIdempotencyKey: 'pulse.actions:tenant-1:exec-1:ticket.advance_flow:ticket-1',
    })).resolves.toEqual(expect.objectContaining({
      id: 'ticket-1',
    }));

    expect(tx.pulseTicket.update).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
    expect(tx.pulseOperationalEvent.create).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
    expect(tx.usageEvent.upsert).not.toHaveBeenCalled();
  });

  it('rejects duplicate in-progress action execution keys without side effects', async () => {
    tx.pulseActionExecution.upsert.mockResolvedValue({
      status: PulseActionExecutionStatus.STARTED,
      attempts: 2,
    });

    await expect(useCase.advanceFlowState('tenant-1', 'ticket-1', actor, {
      nextState: 'collect_context',
      transitionSource: 'ai',
      confidence: 0.91,
      actionIdempotencyKey: 'pulse.actions:tenant-1:exec-1:ticket.advance_flow:ticket-1',
    })).rejects.toBeInstanceOf(ConflictException);

    expect(tx.pulseTicket.update).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
  });

  it('rejects invalid flow transitions', async () => {
    tickets.findById.mockResolvedValue({
      ...baseTicket,
      metadata: {
        flowState: 'intake',
      },
    });

    await expect(
      useCase.advanceFlowState('tenant-1', 'ticket-1', actor, {
        nextState: 'completed',
        transitionSource: 'manual',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tickets.update).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
  });

  it('maps review and completion flow states to ticket status', async () => {
    await useCase.advanceFlowState('tenant-1', 'ticket-1', actor, {
      nextState: 'review_required',
      transitionSource: 'ai',
      confidence: 0.42,
    });

    expect(tickets.update).toHaveBeenCalledWith(
      'tenant-1',
      'ticket-1',
      expect.objectContaining({
        status: PulseTicketStatus.PENDING_REVIEW,
      }),
    );

    jest.clearAllMocks();
    tickets.findById.mockResolvedValue({
      ...baseTicket,
      metadata: {
        flowState: 'execute_action',
      },
    });

    await useCase.advanceFlowState('tenant-1', 'ticket-1', actor, {
      nextState: 'completed',
      transitionSource: 'system',
    });

    expect(tickets.update).toHaveBeenCalledWith(
      'tenant-1',
      'ticket-1',
      expect.objectContaining({
        status: PulseTicketStatus.RESOLVED,
        resolvedAt: expect.any(Date),
      }),
    );
  });

  it('routes low-confidence AI flow advancement to review required', async () => {
    tickets.findById.mockResolvedValue({
      ...baseTicket,
      metadata: {
        flowState: 'classify_intent',
      },
    });

    await useCase.advanceFlowState('tenant-1', 'ticket-1', actor, {
      nextState: 'execute_action',
      transitionSource: 'ai',
      confidence: 0.5,
      aiDecisionSummary: {
        summary: 'Intent seems plausible but missing key details.',
        modelToken: 'do-not-store',
      },
    });

    expect(tickets.update).toHaveBeenCalledWith(
      'tenant-1',
      'ticket-1',
      expect.objectContaining({
        status: PulseTicketStatus.PENDING_REVIEW,
        metadata: expect.objectContaining({
          flowState: 'review_required',
          flowTransition: expect.objectContaining({
            requestedState: 'execute_action',
            nextState: 'review_required',
            confidenceDecision: expect.objectContaining({
              action: 'review_required',
            }),
          }),
        }),
      }),
    );
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          data: expect.objectContaining({
            aiDecisionSummary: expect.objectContaining({
              modelToken: '[REDACTED]',
            }),
          }),
        }),
      }),
    );
  });

  it('routes very low-confidence automated flow advancement to escalation', async () => {
    tickets.findById.mockResolvedValue({
      ...baseTicket,
      metadata: {
        flowState: 'classify_intent',
      },
    });

    await useCase.advanceFlowState('tenant-1', 'ticket-1', actor, {
      nextState: 'execute_action',
      transitionSource: 'integration',
      confidence: 0.2,
    });

    expect(tickets.update).toHaveBeenCalledWith(
      'tenant-1',
      'ticket-1',
      expect.objectContaining({
        status: PulseTicketStatus.PENDING_REVIEW,
        priority: 75,
        metadata: expect.objectContaining({
          flowState: 'escalated',
        }),
      }),
    );
  });

  it('returns not found without side effects for cross-tenant tickets', async () => {
    tickets.findById.mockResolvedValue(null);

    await expect(
      useCase.cancelTicket('tenant-1', 'ticket-2', actor, { reason: 'Duplicate' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tickets.update).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
  });
});
