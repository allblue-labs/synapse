import { TaskEngineService } from './task-engine.service';

describe('TaskEngineService', () => {
  it('dispatches shared tasks through the configured executor', async () => {
    const executor = {
      execute: jest.fn().mockResolvedValue({ status: 'completed' })
    };
    const service = new TaskEngineService(executor as never);

    const task = {
      id: 'task_1',
      type: 'message' as const,
      tenantId: 'tenant_1',
      module: 'messaging',
      payload: { messageId: 'message_1' }
    };

    await service.dispatch(task);

    expect(executor.execute).toHaveBeenCalledWith(task);
  });
});
