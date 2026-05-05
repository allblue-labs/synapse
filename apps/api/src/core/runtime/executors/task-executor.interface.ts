import type { Task, TaskResult } from '@synapse/contracts';

export interface TaskExecutor {
  execute(task: Task): Promise<TaskResult>;
}
