import { Injectable } from '@nestjs/common';
import type { Task, TaskResult } from '@synapse/contracts';
import { JsonLoggerService } from '../../../common/logging/json-logger.service';
import { TaskExecutor } from './task-executor.interface';

@Injectable()
export class PainExecutor implements TaskExecutor {
  constructor(private readonly logger: JsonLoggerService) {}

  async execute(task: Task): Promise<TaskResult> {
    const startedAt = new Date().toISOString();

    this.logger.write({
      level: 'log',
      context: 'PainExecutor',
      message: 'pain_task_placeholder',
      tenantId: task.tenantId,
      metadata: {
        taskId: task.id,
        taskType: task.type,
        moduleName: task.module
      }
    });

    return {
      taskId: task.id,
      tenantId: task.tenantId,
      module: task.module,
      status: 'queued',
      output: {
        executor: 'pain',
        placeholder: true
      },
      startedAt,
      completedAt: new Date().toISOString()
    };
  }
}
