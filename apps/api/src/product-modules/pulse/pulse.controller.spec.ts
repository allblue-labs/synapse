import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import {
  PulseChannelProvider,
  PulseChannelStatus,
  PulseConversationState,
  PulseOperationalStatus,
  PulseTicketStatus,
  PulseTicketType,
} from '@prisma/client';
import { PERMISSIONS_KEY } from '../../common/authorization';
import { PulseController } from './pulse.controller';

describe('PulseController route protection metadata', () => {
  const reflector = new Reflector();

  it('uses the Pulse route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PulseController)).toBe('pulse');
  });

  it.each([
    ['channels', ['pulse:read']],
    ['channel', ['pulse:read']],
    ['conversations', ['pulse:read']],
    ['conversation', ['pulse:read']],
    ['conversationEvents', ['pulse:read']],
    ['tickets', ['tickets:read']],
    ['ticket', ['tickets:read']],
    ['ticketEvents', ['tickets:read']],
    ['list', ['pulse:read']],
    ['get', ['pulse:read']],
    ['create', ['pulse:write']],
    ['validate', ['pulse:validate']],
    ['reject', ['pulse:reject']],
    ['retry', ['pulse:retry']],
    ['errors', ['pulse:read']],
  ] as const)('%s declares required permissions', (methodName, expected) => {
    const handler = PulseController.prototype[methodName];

    expect(
      reflector.getAllAndOverride(PERMISSIONS_KEY, [handler, PulseController]),
    ).toEqual(expected);
  });
});

describe('PulseController read filter contracts', () => {
  const listQueue = { execute: jest.fn() };
  const getEntry = { execute: jest.fn() };
  const listChannels = { execute: jest.fn() };
  const getChannel = { execute: jest.fn() };
  const listConversations = { execute: jest.fn() };
  const getConversation = { execute: jest.fn() };
  const listTickets = { execute: jest.fn() };
  const getTicket = { execute: jest.fn() };
  const listConversationEvents = { execute: jest.fn() };
  const listTicketEvents = { execute: jest.fn() };
  const createEntry = { execute: jest.fn() };
  const validateEntry = { execute: jest.fn() };
  const rejectEntry = { execute: jest.fn() };
  const retryEntry = { execute: jest.fn() };

  const controller = new PulseController(
    listQueue as never,
    getEntry as never,
    listChannels as never,
    getChannel as never,
    listConversations as never,
    getConversation as never,
    listTickets as never,
    getTicket as never,
    listConversationEvents as never,
    listTicketEvents as never,
    createEntry as never,
    validateEntry as never,
    rejectEntry as never,
    retryEntry as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards tenant-scoped channel filters to the list use case', () => {
    const query = {
      page: 2,
      pageSize: 25,
      provider: PulseChannelProvider.WHATSAPP,
      status: PulseChannelStatus.ACTIVE,
    };

    controller.channels('tenant-1', query);

    expect(listChannels.execute).toHaveBeenCalledWith('tenant-1', query);
  });

  it('forwards tenant-scoped conversation filters to the list use case', () => {
    const query = {
      page: 1,
      pageSize: 10,
      state: PulseConversationState.WAITING_OPERATOR,
      operationalStatus: PulseOperationalStatus.NEEDS_REVIEW,
    };

    controller.conversations('tenant-1', query);

    expect(listConversations.execute).toHaveBeenCalledWith('tenant-1', query);
  });

  it('forwards tenant-scoped ticket filters to the list use case', () => {
    const query = {
      page: 3,
      pageSize: 20,
      type: PulseTicketType.OPERATOR_REVIEW,
      status: PulseTicketStatus.PENDING_REVIEW,
    };

    controller.tickets('tenant-1', query);

    expect(listTickets.execute).toHaveBeenCalledWith('tenant-1', query);
  });

  it('forwards conversation timeline filters with the server tenant context', () => {
    const query = {
      page: 1,
      pageSize: 20,
      eventType: 'pulse.entry.validated',
      occurredFrom: '2026-05-07T10:00:00.000Z',
      occurredTo: '2026-05-07T11:00:00.000Z',
    };

    controller.conversationEvents('tenant-1', 'conversation-1', query);

    expect(listConversationEvents.execute).toHaveBeenCalledWith(
      'tenant-1',
      'conversation-1',
      query,
    );
  });

  it('forwards ticket timeline filters with the server tenant context', () => {
    const query = {
      page: 1,
      pageSize: 20,
      eventType: 'pulse.ticket.created',
      occurredFrom: '2026-05-07T10:00:00.000Z',
      occurredTo: '2026-05-07T11:00:00.000Z',
    };

    controller.ticketEvents('tenant-1', 'ticket-1', query);

    expect(listTicketEvents.execute).toHaveBeenCalledWith(
      'tenant-1',
      'ticket-1',
      query,
    );
  });
});
