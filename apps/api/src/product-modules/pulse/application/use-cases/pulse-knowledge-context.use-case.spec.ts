import { NotFoundException } from '@nestjs/common';
import {
  PulseKnowledgeContextStatus,
  PulseKnowledgeContextType,
} from '@prisma/client';
import { PulseKnowledgeContextUseCase } from './pulse-knowledge-context.use-case';

const actor = {
  sub: 'user-1',
  tenantId: 'tenant-a',
  role: 'OPERATOR' as const,
  email: 'operator@synapse.local',
};

const context = {
  id: 'knowledge-1',
  tenantId: 'tenant-a',
  type: PulseKnowledgeContextType.FAQ,
  title: 'Business hours',
  content: 'Open Monday to Friday.',
  status: PulseKnowledgeContextStatus.ACTIVE,
  metadata: {},
  createdAt: new Date('2026-05-08T10:00:00.000Z'),
  updatedAt: new Date('2026-05-08T10:00:00.000Z'),
};

describe('PulseKnowledgeContextUseCase', () => {
  const knowledge = {
    list: jest.fn(),
    findById: jest.fn(),
    publish: jest.fn(),
    archive: jest.fn(),
  };
  const events = { record: jest.fn() };
  const audit = { record: jest.fn() };
  const usage = { record: jest.fn() };
  const useCase = new PulseKnowledgeContextUseCase(
    knowledge as never,
    events as never,
    audit as never,
    usage as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    knowledge.findById.mockResolvedValue(context);
    knowledge.publish.mockResolvedValue(context);
    knowledge.archive.mockResolvedValue({ ...context, status: PulseKnowledgeContextStatus.ARCHIVED });
    knowledge.list.mockResolvedValue({ data: [context], total: 1, page: 1, pageSize: 5 });
  });

  it('publishes knowledge context and emits event plus audit records', async () => {
    await useCase.publish('tenant-a', actor, {
      type: PulseKnowledgeContextType.FAQ,
      title: 'Business hours',
      content: 'Open Monday to Friday.',
      metadata: { providerToken: 'secret' },
    });

    expect(knowledge.publish).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      type: PulseKnowledgeContextType.FAQ,
      title: 'Business hours',
      content: 'Open Monday to Friday.',
      metadata: { providerToken: 'secret' },
    });
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        eventType: 'pulse.knowledge.published',
        actorUserId: 'user-1',
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        actorUserId: 'user-1',
        action: 'pulse.knowledge.published',
        resourceType: 'PulseKnowledgeContext',
        resourceId: 'knowledge-1',
      }),
    );
    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        moduleSlug: 'pulse',
        metricType: 'STORAGE',
        unit: 'byte',
        resourceType: 'PulseKnowledgeContext',
        resourceId: 'knowledge-1',
        idempotencyKey: 'pulse-knowledge-storage:knowledge-1',
      }),
    );
  });

  it('archives tenant-owned knowledge context', async () => {
    await useCase.archive('tenant-a', actor, 'knowledge-1');

    expect(knowledge.archive).toHaveBeenCalledWith('tenant-a', 'knowledge-1');
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'pulse.knowledge.archived',
      }),
    );
    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metricType: 'AUTOMATION_EXECUTION',
        unit: 'knowledge_operation',
        idempotencyKey: 'pulse-knowledge-archive:knowledge-1',
      }),
    );
  });

  it('queries active tenant knowledge for future retrieval', async () => {
    await useCase.query('tenant-a', {
      query: 'hours',
      type: PulseKnowledgeContextType.FAQ,
      limit: 3,
    });

    expect(knowledge.list).toHaveBeenCalledWith('tenant-a', {
      page: 1,
      pageSize: 3,
      status: PulseKnowledgeContextStatus.ACTIVE,
      type: PulseKnowledgeContextType.FAQ,
      query: 'hours',
    });
  });

  it('throws not found without events for cross-tenant archive attempts', async () => {
    knowledge.archive.mockResolvedValue(null);

    await expect(useCase.archive('tenant-a', actor, 'knowledge-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(events.record).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
  });
});
