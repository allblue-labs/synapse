import { Injectable } from '@nestjs/common';
import { QueueService } from '../../modules/queue/queue.service';

export type TaskDefinition<TPayload extends Record<string, unknown>> = {
  tenantId: string;
  moduleName: string;
  taskType: string;
  payload: TPayload;
};

@Injectable()
export class TaskEngineService {
  constructor(private readonly queues: QueueService) {}

  dispatch<TPayload extends Record<string, unknown>>(task: TaskDefinition<TPayload>) {
    return {
      accepted: true,
      tenantId: task.tenantId,
      moduleName: task.moduleName,
      taskType: task.taskType,
      queuedAt: new Date().toISOString()
    };
  }
}
