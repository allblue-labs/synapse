import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { permissionsForRole, UserRole } from '@synapse/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { PermissionsGuard } from '../../common/authorization';
import { PermissionResolverService } from '../../common/authorization/permission-resolver.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateEntryUseCase } from './application/use-cases/create-entry.use-case';
import { GetChannelUseCase } from './application/use-cases/get-channel.use-case';
import { GetConversationUseCase } from './application/use-cases/get-conversation.use-case';
import { GetEntryUseCase } from './application/use-cases/get-entry.use-case';
import { GetTicketUseCase } from './application/use-cases/get-ticket.use-case';
import { ListChannelsUseCase } from './application/use-cases/list-channels.use-case';
import { ListConversationEventsUseCase } from './application/use-cases/list-conversation-events.use-case';
import { ListConversationsUseCase } from './application/use-cases/list-conversations.use-case';
import { ListQueueUseCase } from './application/use-cases/list-queue.use-case';
import { ListOperationalTimelineUseCase } from './application/use-cases/list-operational-timeline.use-case';
import { ListTicketEventsUseCase } from './application/use-cases/list-ticket-events.use-case';
import { ListTicketsUseCase } from './application/use-cases/list-tickets.use-case';
import { RejectEntryUseCase } from './application/use-cases/reject-entry.use-case';
import { RetryEntryUseCase } from './application/use-cases/retry-entry.use-case';
import { ValidateEntryUseCase } from './application/use-cases/validate-entry.use-case';
import { TicketLifecycleUseCase } from './application/use-cases/ticket-lifecycle.use-case';
import { PulseKnowledgeContextUseCase } from './application/use-cases/pulse-knowledge-context.use-case';
import { PulseSchedulingIntegrationUseCase } from './application/use-cases/pulse-scheduling-integration.use-case';
import { PulseController } from './pulse.controller';

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      headers: Record<string, string | undefined>;
    }>();

    const tenantId = request.headers['x-test-tenant-id'];
    if (!tenantId) {
      return true;
    }

    request.user = {
      sub: request.headers['x-test-user-id'] ?? 'user-1',
      tenantId,
      role: (request.headers['x-test-role'] ?? 'OWNER') as UserRole,
      email: 'ninja@synapse.local',
    };
    return true;
  }
}

describe('Pulse HTTP read routes', () => {
  let app: INestApplication;
  let baseUrl: string;

  const listChannels = { execute: jest.fn() };
  const listConversations = { execute: jest.fn() };
  const listTickets = { execute: jest.fn() };
  const listConversationEvents = { execute: jest.fn() };
  const listTicketEvents = { execute: jest.fn() };
  const listOperationalTimeline = { execute: jest.fn() };
  const ticketLifecycle = {
    assignTicket: jest.fn(),
    resolveTicket: jest.fn(),
    reopenTicket: jest.fn(),
    escalateTicket: jest.fn(),
    cancelTicket: jest.fn(),
    submitOperatorReview: jest.fn(),
    advanceFlowState: jest.fn(),
  };
  const knowledgeContext = {
    list: jest.fn(),
    get: jest.fn(),
    query: jest.fn(),
    publish: jest.fn(),
    archive: jest.fn(),
  };
  const schedulingIntegrations = {
    list: jest.fn(),
    get: jest.fn(),
    prepareAvailability: jest.fn(),
    prepareBooking: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const permissionResolver = {
    resolve: jest.fn(async (user: AuthenticatedUser) => ({
      role: user.role,
      permissions: permissionsForRole(user.role),
      source: 'membership' as const,
    })),
  };

  const okPage = { data: [], total: 0, page: 1, pageSize: 20 };

  async function request(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'x-test-tenant-id': 'tenant-a',
        'x-test-role': 'OWNER',
        ...(init?.headers ?? {}),
      },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PulseController],
      providers: [
        Reflector,
        { provide: APP_GUARD, useClass: TestAuthGuard },
        { provide: APP_GUARD, useClass: TenantGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
        { provide: AuditService, useValue: audit },
        { provide: PermissionResolverService, useValue: permissionResolver },
        { provide: ListQueueUseCase, useValue: { execute: jest.fn().mockResolvedValue(okPage) } },
        { provide: GetEntryUseCase, useValue: { execute: jest.fn() } },
        { provide: ListChannelsUseCase, useValue: listChannels },
        { provide: GetChannelUseCase, useValue: { execute: jest.fn() } },
        { provide: ListConversationsUseCase, useValue: listConversations },
        { provide: GetConversationUseCase, useValue: { execute: jest.fn() } },
        { provide: ListTicketsUseCase, useValue: listTickets },
        { provide: GetTicketUseCase, useValue: { execute: jest.fn() } },
        { provide: ListConversationEventsUseCase, useValue: listConversationEvents },
        { provide: ListTicketEventsUseCase, useValue: listTicketEvents },
        { provide: ListOperationalTimelineUseCase, useValue: listOperationalTimeline },
        { provide: CreateEntryUseCase, useValue: { execute: jest.fn() } },
        { provide: ValidateEntryUseCase, useValue: { execute: jest.fn() } },
        { provide: RejectEntryUseCase, useValue: { execute: jest.fn() } },
        { provide: RetryEntryUseCase, useValue: { execute: jest.fn() } },
        { provide: TicketLifecycleUseCase, useValue: ticketLifecycle },
        { provide: PulseKnowledgeContextUseCase, useValue: knowledgeContext },
        { provide: PulseSchedulingIntegrationUseCase, useValue: schedulingIntegrations },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    listChannels.execute.mockResolvedValue(okPage);
    listConversations.execute.mockResolvedValue(okPage);
    listTickets.execute.mockResolvedValue(okPage);
    listConversationEvents.execute.mockResolvedValue(okPage);
    listTicketEvents.execute.mockResolvedValue(okPage);
    listOperationalTimeline.execute.mockResolvedValue(okPage);
    ticketLifecycle.assignTicket.mockResolvedValue({ id: 'ticket-1', status: 'OPEN' });
    ticketLifecycle.resolveTicket.mockResolvedValue({ id: 'ticket-1', status: 'RESOLVED' });
    ticketLifecycle.advanceFlowState.mockResolvedValue({ id: 'ticket-1', status: 'PENDING_REVIEW' });
    knowledgeContext.list.mockResolvedValue(okPage);
    knowledgeContext.query.mockResolvedValue(okPage);
    knowledgeContext.publish.mockResolvedValue({ id: 'knowledge-1' });
    schedulingIntegrations.list.mockResolvedValue(okPage);
    schedulingIntegrations.prepareAvailability.mockResolvedValue({
      prepared: true,
      executable: false,
      reason: 'provider_call_not_implemented',
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('validates and transforms channel filters over HTTP', async () => {
    const response = await request(
      '/v1/pulse/channels?page=2&pageSize=25&provider=WHATSAPP&status=ACTIVE',
    );

    expect(response.status).toBe(200);
    expect(listChannels.execute).toHaveBeenCalledWith('tenant-a', {
      page: 2,
      pageSize: 25,
      provider: 'WHATSAPP',
      status: 'ACTIVE',
    });
  });

  it('rejects invalid channel filters before the use case runs', async () => {
    const response = await request('/v1/pulse/channels?provider=EMAIL&pageSize=101');

    expect(response.status).toBe(400);
    expect(listChannels.execute).not.toHaveBeenCalled();
  });

  it('validates and transforms conversation filters over HTTP', async () => {
    const response = await request(
      '/v1/pulse/conversations?state=WAITING_OPERATOR&operationalStatus=NEEDS_REVIEW',
    );

    expect(response.status).toBe(200);
    expect(listConversations.execute).toHaveBeenCalledWith('tenant-a', {
      page: 1,
      pageSize: 20,
      state: 'WAITING_OPERATOR',
      operationalStatus: 'NEEDS_REVIEW',
    });
  });

  it('validates and transforms ticket filters over HTTP', async () => {
    const response = await request(
      '/v1/pulse/tickets?type=OPERATOR_REVIEW&status=PENDING_REVIEW&page=3',
    );

    expect(response.status).toBe(200);
    expect(listTickets.execute).toHaveBeenCalledWith('tenant-a', {
      page: 3,
      pageSize: 20,
      type: 'OPERATOR_REVIEW',
      status: 'PENDING_REVIEW',
    });
  });

  it('validates event date filters over HTTP', async () => {
    const response = await request(
      '/v1/pulse/tickets/ticket-1/events?eventType=pulse.ticket.created&occurredFrom=2026-05-07T10:00:00.000Z&occurredTo=2026-05-07T11:00:00.000Z',
    );

    expect(response.status).toBe(200);
    expect(listTicketEvents.execute).toHaveBeenCalledWith('tenant-a', 'ticket-1', {
      page: 1,
      pageSize: 20,
      eventType: 'pulse.ticket.created',
      occurredFrom: '2026-05-07T10:00:00.000Z',
      occurredTo: '2026-05-07T11:00:00.000Z',
    });
  });

  it('validates consolidated ticket timeline categories over HTTP', async () => {
    const response = await request('/v1/pulse/tickets/ticket-1/timeline?category=workflow_state');

    expect(response.status).toBe(200);
    expect(listOperationalTimeline.execute).toHaveBeenCalledWith(
      'tenant-a',
      'ticket',
      'ticket-1',
      {
        page: 1,
        pageSize: 20,
        category: 'workflow_state',
      },
    );
  });

  it('rejects unsupported consolidated timeline categories', async () => {
    const response = await request('/v1/pulse/conversations/conversation-1/timeline?category=raw_chat');

    expect(response.status).toBe(400);
    expect(listOperationalTimeline.execute).not.toHaveBeenCalled();
  });

  it('rejects invalid event date filters before the use case runs', async () => {
    const response = await request('/v1/pulse/conversations/conversation-1/events?occurredFrom=yesterday');

    expect(response.status).toBe(400);
    expect(listConversationEvents.execute).not.toHaveBeenCalled();
  });

  it('rejects cross-tenant headers before filtered reads run', async () => {
    const response = await request('/v1/pulse/channels?status=ACTIVE', {
      headers: {
        'x-test-tenant-id': 'tenant-a',
        'x-tenant-id': 'tenant-b',
      },
    });

    expect(response.status).toBe(401);
    expect(listChannels.execute).not.toHaveBeenCalled();
  });

  it('audits forbidden filtered read attempts', async () => {
    const response = await request('/v1/pulse/tickets?status=OPEN', {
      headers: {
        'x-test-role': 'invalid-role',
      },
    });

    expect(response.status).toBe(403);
    expect(listTickets.execute).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        actorUserId: 'user-1',
        action: 'auth.forbidden',
        resourceType: 'RoutePermission',
        metadata: expect.objectContaining({
          required: ['tickets:read'],
          jwtRole: 'invalid-role',
          resolvedRole: 'invalid-role',
          source: 'membership',
        }),
      }),
    );
  });

  it('validates and routes assign ticket commands over HTTP', async () => {
    const response = await request('/v1/pulse/tickets/ticket-1/assign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        assignedUserId: 'user-2',
        note: 'Needs operator ownership',
      }),
    });

    expect(response.status).toBe(201);
    expect(ticketLifecycle.assignTicket).toHaveBeenCalledWith(
      'tenant-a',
      'ticket-1',
      expect.objectContaining({ sub: 'user-1', tenantId: 'tenant-a' }),
      {
        assignedUserId: 'user-2',
        note: 'Needs operator ownership',
      },
    );
  });

  it('rejects invalid resolve commands before lifecycle use cases run', async () => {
    const response = await request('/v1/pulse/tickets/ticket-1/resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        resolutionSummary: 'Done',
        providerToken: 'forbidden',
      }),
    });

    expect(response.status).toBe(400);
    expect(ticketLifecycle.resolveTicket).not.toHaveBeenCalled();
  });

  it('validates guided flow states over HTTP', async () => {
    const response = await request('/v1/pulse/tickets/ticket-1/flow/advance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nextState: 'review_required',
        transitionSource: 'ai',
        confidence: 0.41,
      }),
    });

    expect(response.status).toBe(201);
    expect(ticketLifecycle.advanceFlowState).toHaveBeenCalledWith(
      'tenant-a',
      'ticket-1',
      expect.objectContaining({ sub: 'user-1', tenantId: 'tenant-a' }),
      {
        nextState: 'review_required',
        transitionSource: 'ai',
        confidence: 0.41,
      },
    );
  });

  it('rejects unsupported guided flow states before lifecycle use cases run', async () => {
    const response = await request('/v1/pulse/tickets/ticket-1/flow/advance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nextState: 'freeform_magic',
      }),
    });

    expect(response.status).toBe(400);
    expect(ticketLifecycle.advanceFlowState).not.toHaveBeenCalled();
  });

  it('validates knowledge context list filters over HTTP', async () => {
    const response = await request('/v1/pulse/knowledge?type=FAQ&status=ACTIVE&query=hours');

    expect(response.status).toBe(200);
    expect(knowledgeContext.list).toHaveBeenCalledWith('tenant-a', {
      page: 1,
      pageSize: 20,
      type: 'FAQ',
      status: 'ACTIVE',
      query: 'hours',
    });
  });

  it('rejects unsupported knowledge context types before use cases run', async () => {
    const response = await request('/v1/pulse/knowledge?type=SECRET_NOTE');

    expect(response.status).toBe(400);
    expect(knowledgeContext.list).not.toHaveBeenCalled();
  });

  it('validates knowledge publication over HTTP', async () => {
    const response = await request('/v1/pulse/knowledge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'OPERATIONAL_INSTRUCTION',
        title: 'Escalation policy',
        content: 'Escalate unresolved scheduling conflicts to an operator.',
      }),
    });

    expect(response.status).toBe(201);
    expect(knowledgeContext.publish).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ sub: 'user-1', tenantId: 'tenant-a' }),
      {
        type: 'OPERATIONAL_INSTRUCTION',
        title: 'Escalation policy',
        content: 'Escalate unresolved scheduling conflicts to an operator.',
      },
    );
  });

  it('validates scheduling integration filters over HTTP', async () => {
    const response = await request('/v1/pulse/integrations/scheduling?provider=GOOGLE_CALENDAR&status=ACTIVE');

    expect(response.status).toBe(200);
    expect(schedulingIntegrations.list).toHaveBeenCalledWith('tenant-a', {
      page: 1,
      pageSize: 20,
      provider: 'GOOGLE_CALENDAR',
      status: 'ACTIVE',
    });
  });

  it('rejects unsupported scheduling providers before use cases run', async () => {
    const response = await request('/v1/pulse/integrations/scheduling?provider=ZOOM');

    expect(response.status).toBe(400);
    expect(schedulingIntegrations.list).not.toHaveBeenCalled();
  });

  it('prepares scheduling availability without provider calls', async () => {
    const response = await request('/v1/pulse/scheduling/availability/prepare', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'GOOGLE_CALENDAR',
        integrationId: 'integration-1',
        windowStart: '2026-05-08T10:00:00.000Z',
        windowEnd: '2026-05-08T12:00:00.000Z',
        durationMinutes: 30,
        timezone: 'America/Recife',
      }),
    });

    expect(response.status).toBe(201);
    expect(schedulingIntegrations.prepareAvailability).toHaveBeenCalledWith('tenant-a', {
      provider: 'GOOGLE_CALENDAR',
      integrationId: 'integration-1',
      windowStart: '2026-05-08T10:00:00.000Z',
      windowEnd: '2026-05-08T12:00:00.000Z',
      durationMinutes: 30,
      timezone: 'America/Recife',
    });
  });
});
