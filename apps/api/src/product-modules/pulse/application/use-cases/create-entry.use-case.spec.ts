import { PulseChannelProvider, PulseStatus } from '@prisma/client';
import { CreateEntryUseCase } from './create-entry.use-case';

function createEntry(overrides = {}) {
  return {
    id: 'entry_1',
    tenantId: 'tenant_a',
    conversationId: 'conversation_1',
    status: PulseStatus.PROCESSING,
    ...overrides,
  };
}

describe('CreateEntryUseCase', () => {
  it('queues processing, records usage, and emits an operational event', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue(createEntry()),
    };
    const queue = {
      add: jest.fn(),
    };
    const usage = {
      record: jest.fn(),
    };
    const events = {
      record: jest.fn(),
    };
    const channels = {
      upsert: jest.fn(),
    };
    const conversations = {
      findById: jest.fn().mockResolvedValue({ id: 'conversation_1' }),
      resolve: jest.fn(),
    };
    const useCase = new CreateEntryUseCase(
      repository as never,
      queue as never,
      usage as never,
      events as never,
      channels as never,
      conversations as never,
    );

    await useCase.execute({
      tenantId: 'tenant_a',
      contactPhone: '+15551234567',
      originalMessage: 'Need help',
      mediaUrl: 'https://media.example/audio.ogg',
      conversationId: 'conversation_1',
    });

    expect(conversations.findById).toHaveBeenCalledWith('tenant_a', 'conversation_1');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: 'conversation_1',
    }));
    expect(queue.add).toHaveBeenCalledWith(
      'process',
      { tenantId: 'tenant_a', entryId: 'entry_1' },
      expect.objectContaining({ jobId: 'pulse:entry_1' }),
    );
    expect(usage.record).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant_a',
      moduleSlug: 'pulse',
      resourceType: 'PulseEntry',
      resourceId: 'entry_1',
    }));
    expect(events.record).toHaveBeenCalledWith({
      tenantId: 'tenant_a',
      eventType: 'pulse.conversation.linked',
      conversationId: 'conversation_1',
      payload: {
        conversationId: 'conversation_1',
        source: 'direct_id',
      },
    });
    expect(events.record).toHaveBeenCalledWith({
      tenantId: 'tenant_a',
      eventType: 'pulse.entry.received',
      conversationId: 'conversation_1',
      payload: {
        entryId: 'entry_1',
        hasMedia: true,
      },
      metadata: {
        source: 'pulse.queue',
      },
    });
  });

  it('resolves channel and conversation context before creating entries', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue(createEntry()),
    };
    const queue = {
      add: jest.fn(),
    };
    const usage = {
      record: jest.fn(),
    };
    const events = {
      record: jest.fn(),
    };
    const channels = {
      upsert: jest.fn().mockResolvedValue({ id: 'channel_1' }),
    };
    const conversations = {
      findById: jest.fn(),
      resolve: jest.fn().mockResolvedValue({ id: 'conversation_1' }),
    };
    const useCase = new CreateEntryUseCase(
      repository as never,
      queue as never,
      usage as never,
      events as never,
      channels as never,
      conversations as never,
    );

    await useCase.execute({
      tenantId: 'tenant_a',
      contactPhone: '+15551234567',
      contactName: 'Customer',
      originalMessage: 'Need help',
      provider: PulseChannelProvider.WHATSAPP,
      channelIdentifier: '+15550001111',
    });

    expect(channels.upsert).toHaveBeenCalledWith({
      tenantId: 'tenant_a',
      provider: PulseChannelProvider.WHATSAPP,
      identifier: '+15550001111',
      metadata: { source: 'pulse.entry' },
    });
    expect(conversations.resolve).toHaveBeenCalledWith({
      tenantId: 'tenant_a',
      channelId: 'channel_1',
      participantRef: '+15551234567',
      participantLabel: 'Customer',
      metadata: { source: 'pulse.entry' },
    });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant_a',
      conversationId: 'conversation_1',
    }));
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant_a',
      eventType: 'pulse.conversation.resolved',
      channelId: 'channel_1',
      conversationId: 'conversation_1',
    }));
  });

  it('rejects direct conversation ids that do not belong to the tenant', async () => {
    const repository = {
      create: jest.fn(),
    };
    const queue = {
      add: jest.fn(),
    };
    const usage = {
      record: jest.fn(),
    };
    const events = {
      record: jest.fn(),
    };
    const channels = {
      upsert: jest.fn(),
    };
    const conversations = {
      findById: jest.fn().mockResolvedValue(null),
      resolve: jest.fn(),
    };
    const useCase = new CreateEntryUseCase(
      repository as never,
      queue as never,
      usage as never,
      events as never,
      channels as never,
      conversations as never,
    );

    await expect(useCase.execute({
      tenantId: 'tenant_a',
      contactPhone: '+15551234567',
      conversationId: 'conversation_from_other_tenant',
    })).rejects.toThrow('Pulse conversation conversation_from_other_tenant not found');

    expect(repository.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
  });
});
