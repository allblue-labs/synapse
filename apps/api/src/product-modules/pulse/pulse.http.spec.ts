import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { UserRole } from '@synapse/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { PermissionsGuard } from '../../common/authorization';
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
import { ListTicketEventsUseCase } from './application/use-cases/list-ticket-events.use-case';
import { ListTicketsUseCase } from './application/use-cases/list-tickets.use-case';
import { RejectEntryUseCase } from './application/use-cases/reject-entry.use-case';
import { RetryEntryUseCase } from './application/use-cases/retry-entry.use-case';
import { ValidateEntryUseCase } from './application/use-cases/validate-entry.use-case';
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
  const audit = { record: jest.fn() };

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
        { provide: CreateEntryUseCase, useValue: { execute: jest.fn() } },
        { provide: ValidateEntryUseCase, useValue: { execute: jest.fn() } },
        { provide: RejectEntryUseCase, useValue: { execute: jest.fn() } },
        { provide: RetryEntryUseCase, useValue: { execute: jest.fn() } },
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
  });

  afterAll(async () => {
    await app.close();
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
          role: 'invalid-role',
        }),
      }),
    );
  });
});
