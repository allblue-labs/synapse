import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExecutionRequestContract, ExecutionResponseContract } from '@synapse/contracts';

export type RuntimeResultHandlerInput = {
  tenantId: string;
  executionRequestId: string;
  status: ExecutionResponseContract['status'];
  output?: Record<string, unknown>;
  errorMessage?: string;
  traceId?: string;
  request: ExecutionRequestContract;
};

export interface RuntimeResultHandler {
  readonly moduleSlug: string;
  handle(input: RuntimeResultHandlerInput): Promise<unknown>;
}

@Injectable()
export class RuntimeResultHandlerRegistry {
  private readonly handlers = new Map<string, RuntimeResultHandler>();

  register(handler: RuntimeResultHandler) {
    this.handlers.set(handler.moduleSlug, handler);
  }

  resolve(moduleSlug: string) {
    const handler = this.handlers.get(moduleSlug);
    if (!handler) {
      throw new NotFoundException(`Runtime result handler not registered for module "${moduleSlug}".`);
    }
    return handler;
  }
}
