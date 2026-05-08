import { Module } from '@nestjs/common';
import { LocalExecutor } from './executors/local.executor';
import { PainExecutor } from './executors/pain.executor';
import { RuntimeService } from './runtime.service';
import { RuntimeExecutionController } from './runtime-execution.controller';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';
import { StubPainClient } from './pain/stub-pain.client';

@Module({
  controllers: [RuntimeExecutionController],
  providers: [
    RuntimeService,
    RuntimeExecutionLifecycleService,
    StubPainClient,
    LocalExecutor,
    PainExecutor,
  ],
  exports: [RuntimeService, RuntimeExecutionLifecycleService, LocalExecutor, PainExecutor]
})
export class RuntimeModule {}
