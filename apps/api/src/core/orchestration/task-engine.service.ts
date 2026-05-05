import { Injectable } from '@nestjs/common';
import type { Task } from '@synapse/contracts';
import { LocalExecutor } from '../runtime/executors/local.executor';

@Injectable()
export class TaskEngineService {
  constructor(private readonly executor: LocalExecutor) {}

  dispatch(task: Task) {
    return this.executor.execute(task);
  }
}
