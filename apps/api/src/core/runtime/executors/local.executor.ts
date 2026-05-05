import { Injectable } from '@nestjs/common';
import type { Task, TaskResult } from '@synapse/contracts';
import { JsonLoggerService } from '../../../common/logging/json-logger.service';
import { TaskExecutor } from './task-executor.interface';

@Injectable()
export class LocalExecutor implements TaskExecutor {
  constructor(private readonly logger: JsonLoggerService) {}

  async execute(task: Task): Promise<TaskResult> {
    const startedAt = new Date().toISOString();

    this.logger.write({
      level: 'log',
      context: 'LocalExecutor',
      message: 'task_executed_locally',
      tenantId: task.tenantId,
      metadata: {
        taskId: task.id,
        taskType: task.type,
        moduleName: task.module,
        priority: task.priority
      }
    });

    return {
      taskId: task.id,
      tenantId: task.tenantId,
      module: task.module,
      status: 'completed',
      output: {
        executor: 'local',
        accepted: true
      },
      startedAt,
      completedAt: new Date().toISOString()
    };
  }
}
