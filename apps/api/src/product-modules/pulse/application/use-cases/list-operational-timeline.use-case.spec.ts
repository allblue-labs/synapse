import { ListOperationalTimelineUseCase } from './list-operational-timeline.use-case';

describe('ListOperationalTimelineUseCase', () => {
  const events = {
    listForTicket: jest.fn(),
    listForConversation: jest.fn(),
  };
  const useCase = new ListOperationalTimelineUseCase(events as never);

  beforeEach(() => {
    jest.clearAllMocks();
    events.listForTicket.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    events.listForConversation.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });

  it('lists ticket timelines by category event sets', async () => {
    const result = await useCase.execute('tenant-1', 'ticket', 'ticket-1', {
      category: 'workflow_state',
      page: 2,
      pageSize: 10,
    });

    expect(events.listForTicket).toHaveBeenCalledWith('tenant-1', 'ticket-1', {
      page: 2,
      pageSize: 10,
      eventType: undefined,
      eventTypes: [
        'pulse.ticket.advance_flow_state',
        'pulse.flow.transitioned',
      ],
      occurredFrom: undefined,
      occurredTo: undefined,
    });
    expect(result).toEqual({
      scope: 'ticket',
      resourceId: 'ticket-1',
      category: 'workflow_state',
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });

  it('lists conversation timelines by explicit event type when no category is used', async () => {
    await useCase.execute('tenant-1', 'conversation', 'conversation-1', {
      eventType: 'pulse.entry.validated',
      occurredFrom: '2026-05-08T10:00:00.000Z',
    });

    expect(events.listForConversation).toHaveBeenCalledWith(
      'tenant-1',
      'conversation-1',
      {
        page: undefined,
        pageSize: undefined,
        eventType: 'pulse.entry.validated',
        eventTypes: undefined,
        occurredFrom: new Date('2026-05-08T10:00:00.000Z'),
        occurredTo: undefined,
      },
    );
  });
});
