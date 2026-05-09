import { Module } from '@nestjs/common';
import { LocalExecutor } from './executors/local.executor';
import { PainExecutor } from './executors/pain.executor';
import { RuntimeService } from './runtime.service';
import { RuntimeHttpClient } from './runtime-http.client';
import { RuntimeExecutionController } from './runtime-execution.controller';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';
import { RuntimeExecutionGovernanceService } from './runtime-execution-governance.service';
import { RuntimeSignatureService } from './runtime-signature.service';
import { StubPainClient } from './pain/stub-pain.client';

@Module({
  controllers: [RuntimeExecutionController],
  providers: [
    RuntimeService,
    RuntimeHttpClient,
    RuntimeExecutionLifecycleService,
    RuntimeExecutionGovernanceService,
    RuntimeSignatureService,
    StubPainClient,
    LocalExecutor,
    PainExecutor,
  ],
  exports: [
    RuntimeService,
    RuntimeHttpClient,
    RuntimeExecutionLifecycleService,
    RuntimeExecutionGovernanceService,
    RuntimeSignatureService,
    LocalExecutor,
    PainExecutor,
  ],
})
export class RuntimeModule {}
