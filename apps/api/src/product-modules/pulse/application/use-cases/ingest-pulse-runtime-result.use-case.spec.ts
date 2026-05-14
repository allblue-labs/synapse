import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { IngestPulseRuntimeResultUseCase } from './ingest-pulse-runtime-result.use-case';
import { PULSE_CONTEXT_PACK_VERSION } from '../../contracts/pulse.contracts';
import { PULSE_EVENT_TYPES } from '../../domain/pulse-event-types';

describe('IngestPulseRuntimeResultUseCase', () => {
  const runtimeLifecycle = {
    getRequest: jest.fn(),
    transition: jest.fn(),
  };
  const planner = {
    plan: jest.fn(),
  };
  const queues = {
    enqueueTimeline: jest.fn(),
  };
  const permissions = {
    resolve: jest.fn(),
  };

  const actor = {
    userId: 'user-1',
    email: 'operator@example.com',
    role: 'tenant_operator' as const,
    permissions: ['tickets:write' as const],
  };

  const requiredOutputSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['decisionSummary', 'confidence', 'nextState', 'recommendedActions'],
    properties: {
      decisionSummary: { type: 'string', maxLength: 1000 },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      nextState: { type: 'string' },
      recommendedActions: {
        type: 'array',
        items: { type: 'string', enum: ['ticket.advance_flow'] },
        maxItems: 10,
      },
      executionType: { const: 'advance_flow' },
    },
  };

  const contextPack = {
    version: PULSE_CONTEXT_PACK_VERSION,
    tenantId: 'tenant-1',
    workspaceId: 'tenant-1',
    module: 'pulse' as const,
    skill: 'SUPPORT' as const,
    executionType: 'advance_flow' as const,
    conversationState: { id: 'conversation-1' },
    ticketState: { id: 'ticket-1' },
    playbookState: null,
    knowledgeSnippets: [],
    productsOrServices: [],
    campaignContext: [],
    schedulingContext: {},
    allowedActions: ['ticket.advance_flow'],
    requiredOutputSchema,
    securityHints: [],
    usageHints: {},
    assembledAt: '2026-05-09T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    runtimeLifecycle.getRequest.mockResolvedValue({
      id: 'exec-1',
      context: {
        tenantId: 'tenant-1',
        moduleSlug: 'pulse',
        metadata: { actorSnapshot: actor },
      },
      requestType: 'pulse.advance_flow',
      idempotencyKey: 'idem-1',
      input: { contextPack },
      requestedAt: '2026-05-09T10:00:00.000Z',
    });
    runtimeLifecycle.transition.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-1',
      moduleSlug: 'pulse',
      status: 'SUCCEEDED',
      output: { ok: true },
    });
    planner.plan.mockResolvedValue({
      enqueued: [{ action: 'ticket.advance_flow', idempotencyKey: 'action-idem' }],
      skipped: [],
    });
    permissions.resolve.mockResolvedValue({
      role: actor.role,
      permissions: actor.permissions,
      source: 'membership',
    });
  });

  it('loads tenant-scoped execution context, transitions lifecycle, and plans governed actions', async () => {
    const useCase = new IngestPulseRuntimeResultUseCase(
      runtimeLifecycle as never,
      planner as never,
      queues as never,
      permissions as never,
    );

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: {
        decisionSummary: 'Advance flow safely.',
        confidence: 0.91,
        nextState: 'collect_context',
        recommendedActions: ['ticket.advance_flow'],
      },
      traceId: 'trace-1',
    })).resolves.toEqual({
      execution: expect.objectContaining({ id: 'exec-1', status: 'SUCCEEDED' }),
      actionPlan: {
        enqueued: [{ action: 'ticket.advance_flow', idempotencyKey: 'action-idem' }],
        skipped: [],
      },
    });

    expect(runtimeLifecycle.getRequest).toHaveBeenCalledWith('tenant-1', 'exec-1');
    expect(runtimeLifecycle.transition).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      executionId: 'exec-1',
      status: 'SUCCEEDED',
      actorUserId: 'user-1',
      output: expect.objectContaining({ decisionSummary: 'Advance flow safely.' }),
      errorMessage: undefined,
    });
    expect(planner.plan).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      ticketId: 'ticket-1',
      conversationId: 'conversation-1',
      allowedActions: ['ticket.advance_flow'],
      output: expect.objectContaining({ nextState: 'collect_context' }),
      actor,
      traceId: 'trace-1',
    });
    expect(permissions.resolve).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'operator@example.com',
      role: 'tenant_operator',
      tenantId: 'tenant-1',
    }, 'tenant-1');
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_RESULT_INGESTED,
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      eventType: PULSE_EVENT_TYPES.RUNTIME_ACTION_PLANNED,
      conversationId: 'conversation-1',
      ticketId: 'ticket-1',
    }));
  });

  it('does not plan actions for non-successful runtime results', async () => {
    runtimeLifecycle.transition.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-1',
      moduleSlug: 'pulse',
      status: 'FAILED',
      errorMessage: 'provider failed',
    });
    const useCase = new IngestPulseRuntimeResultUseCase(
      runtimeLifecycle as never,
      planner as never,
      queues as never,
      permissions as never,
    );

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'FAILED',
      errorMessage: 'provider failed',
    })).resolves.toEqual({
      execution: expect.objectContaining({ status: 'FAILED' }),
      actionPlan: {
        enqueued: [],
        skipped: [{ action: 'runtime.output', reason: 'execution_not_succeeded' }],
      },
    });
    expect(planner.plan).not.toHaveBeenCalled();
    expect(permissions.resolve).not.toHaveBeenCalled();
  });

  it('revalidates actor snapshot permissions and skips runtime action planning when current permissions deny it', async () => {
    permissions.resolve.mockResolvedValue({
      role: 'tenant_viewer',
      permissions: ['tickets:read'],
      source: 'membership',
    });
    planner.plan.mockRejectedValue(new ForbiddenException('Missing required action permission(s): tickets:write'));
    const useCase = new IngestPulseRuntimeResultUseCase(
      runtimeLifecycle as never,
      planner as never,
      queues as never,
      permissions as never,
    );

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: {
        decisionSummary: 'Advance flow safely.',
        confidence: 0.91,
        nextState: 'collect_context',
        recommendedActions: ['ticket.advance_flow'],
      },
      traceId: 'trace-1',
    })).resolves.toEqual({
      execution: expect.objectContaining({ id: 'exec-1', status: 'SUCCEEDED' }),
      actionPlan: {
        enqueued: [],
        skipped: [{ action: 'runtime.output', reason: 'actor_permission_revalidation_failed' }],
      },
    });

    expect(planner.plan).toHaveBeenCalledWith(expect.objectContaining({
      actor: expect.objectContaining({
        role: 'tenant_viewer',
        permissions: ['tickets:read'],
      }),
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_RESULT_INGESTED,
      payload: expect.objectContaining({
        actionPlan: expect.objectContaining({
          skipped: [{ action: 'runtime.output', reason: 'actor_permission_revalidation_failed' }],
        }),
      }),
    }));
  });

  it('rejects successful runtime output with actions outside the context schema before lifecycle transition', async () => {
    const useCase = new IngestPulseRuntimeResultUseCase(
      runtimeLifecycle as never,
      planner as never,
      queues as never,
      permissions as never,
    );

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: {
        decisionSummary: 'Tries to use an action that was not allowed.',
        confidence: 0.95,
        nextState: 'collect_context',
        recommendedActions: ['ticket.resolve'],
      },
    })).rejects.toThrow('unsupported action');

    expect(runtimeLifecycle.transition).not.toHaveBeenCalled();
    expect(planner.plan).not.toHaveBeenCalled();
    expect(queues.enqueueTimeline).not.toHaveBeenCalled();
  });

  it('rejects successful runtime output with unsupported fields before action planning', async () => {
    const useCase = new IngestPulseRuntimeResultUseCase(
      runtimeLifecycle as never,
      planner as never,
      queues as never,
      permissions as never,
    );

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: {
        decisionSummary: 'Includes an unsafe extra field.',
        confidence: 0.95,
        nextState: 'collect_context',
        recommendedActions: ['ticket.advance_flow'],
        rawProviderPayload: { secret: 'nope' },
      },
    })).rejects.toThrow('unsupported field');

    expect(runtimeLifecycle.transition).not.toHaveBeenCalled();
    expect(planner.plan).not.toHaveBeenCalled();
    expect(queues.enqueueTimeline).not.toHaveBeenCalled();
  });

  it('rejects successful runtime output that does not match the execution type const', async () => {
    const useCase = new IngestPulseRuntimeResultUseCase(
      runtimeLifecycle as never,
      planner as never,
      queues as never,
      permissions as never,
    );

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: {
        decisionSummary: 'Wrong execution type.',
        confidence: 0.95,
        nextState: 'collect_context',
        recommendedActions: ['ticket.advance_flow'],
        executionType: 'classify_intent',
      },
    })).rejects.toThrow('expected value');

    expect(runtimeLifecycle.transition).not.toHaveBeenCalled();
    expect(planner.plan).not.toHaveBeenCalled();
  });

  it('rejects non-Pulse execution requests before transition or action planning', async () => {
    runtimeLifecycle.getRequest.mockResolvedValue({
      id: 'exec-1',
      context: { tenantId: 'tenant-1', moduleSlug: 'other' },
      requestType: 'other.run',
      input: { contextPack },
      requestedAt: '2026-05-09T10:00:00.000Z',
    });
    const useCase = new IngestPulseRuntimeResultUseCase(
      runtimeLifecycle as never,
      planner as never,
      queues as never,
      permissions as never,
    );

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: { decisionSummary: 'x', confidence: 1, nextState: 'collect_context', recommendedActions: [] },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(runtimeLifecycle.transition).not.toHaveBeenCalled();
    expect(planner.plan).not.toHaveBeenCalled();
  });

  it('rejects successful runtime results when the original execution has no actor snapshot', async () => {
    runtimeLifecycle.getRequest.mockResolvedValue({
      id: 'exec-1',
      context: { tenantId: 'tenant-1', moduleSlug: 'pulse' },
      requestType: 'pulse.advance_flow',
      input: { contextPack },
      requestedAt: '2026-05-09T10:00:00.000Z',
    });
    const useCase = new IngestPulseRuntimeResultUseCase(
      runtimeLifecycle as never,
      planner as never,
      queues as never,
      permissions as never,
    );

    await expect(useCase.execute({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: { decisionSummary: 'x', confidence: 1, nextState: 'collect_context', recommendedActions: [] },
    })).rejects.toThrow('actor snapshot');
    expect(runtimeLifecycle.transition).not.toHaveBeenCalled();
    expect(planner.plan).not.toHaveBeenCalled();
  });
});
