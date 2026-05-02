import { Module } from '@nestjs/common';
import { QueueModule } from '../../modules/queue/queue.module';
import { TaskEngineService } from './task-engine.service';
import { WorkflowEngineService } from './workflow-engine.service';

@Module({
  imports: [QueueModule],
  providers: [TaskEngineService, WorkflowEngineService],
  exports: [TaskEngineService, WorkflowEngineService]
})
export class CoreOrchestrationModule {}
