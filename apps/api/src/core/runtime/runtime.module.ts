import { Module } from '@nestjs/common';
import { LocalExecutor } from './executors/local.executor';
import { PainExecutor } from './executors/pain.executor';
import { RuntimeService } from './runtime.service';
import { RuntimeHttpClient } from './runtime-http.client';
import { RuntimeExecutionController } from './runtime-execution.controller';
import { RuntimeExecutionDispatchService } from './runtime-execution-dispatch.service';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';
import { RuntimeExecutionGovernanceService } from './runtime-execution-governance.service';
import { RuntimeResultController } from './runtime-result.controller';
import { RuntimeResultHandlerRegistry } from './runtime-result-handler.registry';
import { RuntimeResultIngressService } from './runtime-result-ingress.service';
import { RuntimeSignatureService } from './runtime-signature.service';
import { StubPainClient } from './pain/stub-pain.client';

@Module({
  controllers: [RuntimeExecutionController, RuntimeResultController],
  providers: [
    RuntimeService,
    RuntimeHttpClient,
    RuntimeExecutionDispatchService,
    RuntimeExecutionLifecycleService,
    RuntimeExecutionGovernanceService,
    RuntimeResultHandlerRegistry,
    RuntimeResultIngressService,
    RuntimeSignatureService,
    StubPainClient,
    LocalExecutor,
    PainExecutor,
  ],
  exports: [
    RuntimeService,
    RuntimeHttpClient,
    RuntimeExecutionDispatchService,
    RuntimeExecutionLifecycleService,
    RuntimeExecutionGovernanceService,
    RuntimeResultHandlerRegistry,
    RuntimeResultIngressService,
    RuntimeSignatureService,
    LocalExecutor,
    PainExecutor,
  ],
})
export class RuntimeModule {}
