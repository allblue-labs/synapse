import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  RuntimeResultHandler,
  RuntimeResultHandlerInput,
  RuntimeResultHandlerRegistry,
} from '../../core/runtime/runtime-result-handler.registry';
import { IngestPulseRuntimeResultUseCase } from './application/use-cases/ingest-pulse-runtime-result.use-case';

@Injectable()
export class PulseRuntimeResultHandler implements RuntimeResultHandler, OnModuleInit {
  readonly moduleSlug = 'pulse';

  constructor(
    private readonly registry: RuntimeResultHandlerRegistry,
    private readonly ingestRuntimeResult: IngestPulseRuntimeResultUseCase,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  handle(input: RuntimeResultHandlerInput) {
    return this.ingestRuntimeResult.execute({
      tenantId: input.tenantId,
      executionRequestId: input.executionRequestId,
      status: input.status,
      output: input.output,
      errorMessage: input.errorMessage,
      traceId: input.traceId,
    });
  }
}
