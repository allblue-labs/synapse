import { Injectable } from '@nestjs/common';
import { RuntimeResultDto } from './dtos/runtime-result.dto';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';
import { RuntimeResultHandlerRegistry } from './runtime-result-handler.registry';

@Injectable()
export class RuntimeResultIngressService {
  constructor(
    private readonly lifecycle: RuntimeExecutionLifecycleService,
    private readonly handlers: RuntimeResultHandlerRegistry,
  ) {}

  async ingest(dto: RuntimeResultDto) {
    const request = await this.lifecycle.getRequest(dto.tenantId, dto.executionRequestId);
    const handler = this.handlers.resolve(request.context.moduleSlug);
    return handler.handle({
      tenantId: dto.tenantId,
      executionRequestId: dto.executionRequestId,
      status: dto.status,
      output: dto.output,
      errorMessage: dto.errorMessage,
      traceId: dto.traceId,
      request,
    });
  }
}
