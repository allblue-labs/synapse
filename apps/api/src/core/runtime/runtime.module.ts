import { Module } from '@nestjs/common';
import { LocalExecutor } from './executors/local.executor';
import { PainExecutor } from './executors/pain.executor';
import { RuntimeService } from './runtime.service';
import { StubPainClient } from './pain/stub-pain.client';

@Module({
  providers: [RuntimeService, StubPainClient, LocalExecutor, PainExecutor],
  exports: [RuntimeService, LocalExecutor, PainExecutor]
})
export class RuntimeModule {}
