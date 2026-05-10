import { ExecutionStatus, PulseTicketStatus, PulseTicketType } from '@prisma/client';
import { AuditService } from '../../../../common/audit/audit.service';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  databaseFixtureIds,
  describeDatabase,
  resetTenantFixtures,
  seedTwoTenants,
} from '../../../../testing/database-fixtures';
import { RuntimeExecutionLifecycleService } from '../../../../core/runtime/runtime-execution-lifecycle.service';
import { PULSE_CONTEXT_PACK_VERSION, PulseContextPack } from '../../contracts/pulse.contracts';
import { PulseActionHandlerRegistry } from '../actions/pulse-action-handler.registry';
import { PulseActionGovernanceService } from '../actions/pulse-action-governance.service';
import { PulseRuntimeActionPlannerService } from '../actions/pulse-runtime-action-planner.service';
import { PulseTicketAdvanceFlowActionHandler } from '../actions/pulse-ticket-advance-flow-action.handler';
import { IngestPulseRuntimeResultUseCase } from './ingest-pulse-runtime-result.use-case';

describeDatabase('Pulse runtime result ingestion database fixtures', () => {
  const ids = databaseFixtureIds('pulse-runtime-result');
  const tenantIds = [ids.tenantA, ids.tenantB];
  const actorSnapshot = {
    userId: 'operator-a',
    email: 'operator-a@synapse.local',
    role: 'tenant_operator' as const,
    permissions: ['tickets:write' as const],
  };
  const actionQueue = {
    enqueueAction: jest.fn(),
  };
  const timelineQueue = {
    enqueueTimeline: jest.fn(),
  };

  let prisma: PrismaService;
  let lifecycle: RuntimeExecutionLifecycleService;
  let ingest: IngestPulseRuntimeResultUseCase;
  let connected = false;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    connected = true;
    await resetTenantFixtures(prisma, tenantIds);
    await seedTwoTenants(prisma, ids);

    lifecycle = new RuntimeExecutionLifecycleService(
      prisma,
      new AuditService(prisma, { write: jest.fn() } as never),
    );
    const registry = new PulseActionHandlerRegistry(
      new PulseTicketAdvanceFlowActionHandler({ advanceFlowState: jest.fn() } as never),
    );
    ingest = new IngestPulseRuntimeResultUseCase(
      lifecycle,
      new PulseRuntimeActionPlannerService(
        new PulseActionGovernanceService(actionQueue as never, registry),
      ),
      timelineQueue as never,
    );
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    await prisma.auditEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.usageEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.executionRequest.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.pulseOperationalEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.pulseTicket.deleteMany({ where: { tenantId: { in: tenantIds } } });
  });

  afterAll(async () => {
    if (connected) {
      await resetTenantFixtures(prisma, tenantIds);
      await prisma.$disconnect();
    }
  });

  it('uses the persisted actor snapshot to plan actions after signed result ingestion', async () => {
    const contextPack = await createContextPack(ids.tenantA);
    const request = await lifecycle.request({
      context: {
        tenantId: ids.tenantA,
        moduleSlug: 'pulse',
        actorUserId: actorSnapshot.userId,
        permissions: actorSnapshot.permissions,
        metadata: { actorSnapshot },
      },
      requestType: 'pulse.advance_flow',
      input: { contextPack },
    });
    await lifecycle.transition({
      tenantId: ids.tenantA,
      executionId: request.id,
      status: ExecutionStatus.RUNNING,
      actorUserId: actorSnapshot.userId,
    });

    await ingest.execute({
      tenantId: ids.tenantA,
      executionRequestId: request.id,
      status: ExecutionStatus.SUCCEEDED,
      output: {
        decisionSummary: 'Advance from runtime fixture.',
        confidence: 0.91,
        nextState: 'collect_context',
        recommendedActions: ['ticket.advance_flow'],
      },
      traceId: 'fixture-trace',
    });

    await expect(
      prisma.executionRequest.findFirst({
        where: { tenantId: ids.tenantA, id: request.id },
      }),
    ).resolves.toEqual(expect.objectContaining({ status: ExecutionStatus.SUCCEEDED }));
    expect(actionQueue.enqueueAction).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: ids.tenantA,
      action: 'ticket.advance_flow',
      actor: actorSnapshot,
      ticketId: contextPack.ticketState?.id,
    }));
    expect(timelineQueue.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: ids.tenantA,
      eventType: 'pulse.runtime.execution_result_ingested',
    }));
    await expect(
      prisma.auditEvent.count({ where: { tenantId: ids.tenantA } }),
    ).resolves.toBeGreaterThanOrEqual(3);
  });

  it('rejects signed result ingestion across tenant boundaries', async () => {
    const request = await lifecycle.request({
      context: {
        tenantId: ids.tenantA,
        moduleSlug: 'pulse',
        actorUserId: actorSnapshot.userId,
        permissions: actorSnapshot.permissions,
        metadata: { actorSnapshot },
      },
      requestType: 'pulse.advance_flow',
      input: { contextPack: await createContextPack(ids.tenantA) },
    });

    await expect(
      ingest.execute({
        tenantId: ids.tenantB,
        executionRequestId: request.id,
        status: ExecutionStatus.SUCCEEDED,
        output: {
          decisionSummary: 'Should not cross tenants.',
          confidence: 0.95,
          nextState: 'collect_context',
          recommendedActions: ['ticket.advance_flow'],
        },
      }),
    ).rejects.toThrow('Runtime execution request not found.');

    expect(actionQueue.enqueueAction).not.toHaveBeenCalled();
    await expect(
      prisma.executionRequest.findFirst({
        where: { tenantId: ids.tenantA, id: request.id },
      }),
    ).resolves.toEqual(expect.objectContaining({ status: ExecutionStatus.REQUESTED }));
  });

  it('rejects automatic action planning when the execution has no actor snapshot', async () => {
    const request = await lifecycle.request({
      context: {
        tenantId: ids.tenantA,
        moduleSlug: 'pulse',
      },
      requestType: 'pulse.advance_flow',
      input: { contextPack: await createContextPack(ids.tenantA) },
    });
    await lifecycle.transition({
      tenantId: ids.tenantA,
      executionId: request.id,
      status: ExecutionStatus.RUNNING,
    });

    await expect(
      ingest.execute({
        tenantId: ids.tenantA,
        executionRequestId: request.id,
        status: ExecutionStatus.SUCCEEDED,
        output: {
          decisionSummary: 'Missing actor should block action planning.',
          confidence: 0.95,
          nextState: 'collect_context',
          recommendedActions: ['ticket.advance_flow'],
        },
      }),
    ).rejects.toThrow('actor snapshot');

    expect(actionQueue.enqueueAction).not.toHaveBeenCalled();
    await expect(
      prisma.executionRequest.findFirst({
        where: { tenantId: ids.tenantA, id: request.id },
      }),
    ).resolves.toEqual(expect.objectContaining({ status: ExecutionStatus.RUNNING }));
  });

  async function createContextPack(tenantId: string): Promise<PulseContextPack> {
    const ticket = await prisma.pulseTicket.create({
      data: {
        tenantId,
        type: PulseTicketType.SUPPORT,
        status: PulseTicketStatus.OPEN,
        title: `Runtime fixture ticket ${tenantId}`,
      },
    });

    return {
      version: PULSE_CONTEXT_PACK_VERSION,
      tenantId,
      workspaceId: tenantId,
      module: 'pulse',
      skill: 'SUPPORT',
      executionType: 'advance_flow',
      conversationState: null,
      ticketState: { id: ticket.id },
      playbookState: null,
      knowledgeSnippets: [],
      productsOrServices: [],
      campaignContext: [],
      schedulingContext: {},
      allowedActions: ['ticket.advance_flow'],
      requiredOutputSchema: {},
      securityHints: [],
      usageHints: {},
      assembledAt: new Date().toISOString(),
    };
  }
});
