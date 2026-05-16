import { BadRequestException, Injectable } from '@nestjs/common';
import type { ExecutionRequestContract, ExecutionResponseContract } from '@synapse/contracts';
import { ExecutionStatus } from '@prisma/client';
import { RuntimeHttpClient } from './runtime-http.client';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';
import { RuntimeUsageMeteringService } from './runtime-usage-metering.service';

@Injectable()
export class RuntimeExecutionDispatchService {
  constructor(
    private readonly lifecycle: RuntimeExecutionLifecycleService,
    private readonly runtime: RuntimeHttpClient,
    private readonly usage: RuntimeUsageMeteringService,
  ) {}

  async dispatchQueued(input: {
    tenantId: string;
    executionId: string;
  }): Promise<{
    request: ExecutionRequestContract;
    response: ExecutionResponseContract;
    transport: string;
  }> {
    const current = await this.lifecycle.get(input.tenantId, input.executionId);
    if (current.status !== ExecutionStatus.QUEUED) {
      throw new BadRequestException('Runtime execution must be QUEUED before dispatch.');
    }

    const request = await this.lifecycle.getRequest(input.tenantId, input.executionId);
    await this.lifecycle.transition({
      tenantId: input.tenantId,
      executionId: input.executionId,
      status: ExecutionStatus.RUNNING,
      output: {
        dispatch: {
          providerCalls: true,
          transport: this.runtime.transport,
          stage: 'runtime_dispatch_started',
        },
      },
    });

    const response = await this.runtime.submit(this.toRuntimeExecutionRequest(request));
    await this.usage.recordProviderCall({
      request,
      response,
      transport: this.runtime.transport,
    });
    return { request, response, transport: this.runtime.transport };
  }

  private toRuntimeExecutionRequest(request: ExecutionRequestContract): ExecutionRequestContract {
    const contextPack = this.objectValue(request.input.contextPack);
    const requiredOutputSchema = this.objectValue(contextPack?.requiredOutputSchema);
    return {
      ...request,
      input: {
        ...request.input,
        providerPreference: ['openai', 'claude'],
        policy: {
          maxRetries: 1,
          fallbackEnabled: true,
          allowedProviders: ['openai', 'claude'],
        },
        timeoutMs: 60_000,
        structuredOutput: requiredOutputSchema
          ? {
              format: 'json_schema',
              schema: requiredOutputSchema,
            }
          : undefined,
        input: {
          messages: [
            {
              role: 'system',
              content: [
                'You are Synapse Runtime executing a governed operational intelligence request.',
                'Return only valid JSON matching the provided schema when a schema is present.',
                'Do not include chain-of-thought, secrets, raw provider payloads, or unrelated advice.',
                'Use audit-safe decision summaries only.',
              ].join(' '),
            },
            {
              role: 'user',
              content: JSON.stringify({
                requestType: request.requestType,
                module: request.context.moduleSlug,
                requiredOutputSchema,
                contextPack,
                payload: this.objectWithout(request.input, ['contextPack']),
              }),
            },
          ],
        },
      },
    };
  }

  private objectValue(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }

  private objectWithout(value: Record<string, unknown>, excluded: string[]) {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !excluded.includes(key)));
  }
}
