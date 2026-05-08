import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ExecutionRequestContract,
  ExecutionResponseContract,
  TenantExecutionContext,
} from '@synapse/contracts';
import { RuntimeSignatureService } from './runtime-signature.service';
import { RuntimeExecutionProvider } from './contracts/runtime-execution.contracts';

type RuntimeRestExecutionResponse = {
  executionId: string;
  tenantId: string;
  provider?: string;
  model?: string;
  output?: string;
  structuredPayload?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  latencyMs?: number;
  status: 'succeeded' | 'failed' | 'cancelled' | 'timed_out';
  error?: string;
  startedAt?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class RuntimeHttpClient implements RuntimeExecutionProvider {
  readonly transport = 'http' as const;

  constructor(
    private readonly config: ConfigService,
    private readonly signatures: RuntimeSignatureService,
  ) {}

  async submit(request: ExecutionRequestContract): Promise<ExecutionResponseContract> {
    const runtimeBaseUrl = this.runtimeBaseUrl();
    const path = '/executions';
    const body = JSON.stringify(this.toRuntimeRequest(request));
    const response = await fetch(`${runtimeBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...this.signatures.sign({ method: 'POST', path, body }),
      },
      body,
    });
    const payload = await response.json().catch(() => ({})) as Partial<RuntimeRestExecutionResponse>;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        typeof payload.error === 'string' ? payload.error : 'Synapse Runtime execution failed.',
      );
    }
    return this.toPlatformResponse(payload as RuntimeRestExecutionResponse, request.context);
  }

  async cancel(): Promise<ExecutionResponseContract> {
    throw new ServiceUnavailableException('Synapse Runtime cancel callback is not implemented yet.');
  }

  private runtimeBaseUrl() {
    const baseUrl = this.config.get<string>('SYNAPSE_RUNTIME_URL');
    if (!baseUrl) {
      throw new ServiceUnavailableException('Synapse Runtime URL is not configured.');
    }
    return baseUrl.replace(/\/+$/, '');
  }

  private toRuntimeRequest(request: ExecutionRequestContract) {
    return {
      tenantId: request.context.tenantId,
      workspaceId: request.context.metadata?.workspaceId,
      module: request.context.moduleSlug,
      skill: request.requestType,
      providerPreference: request.input.providerPreference,
      modelPreference: request.input.modelPreference,
      policy: request.input.policy,
      allowedTools: request.input.allowedTools,
      structuredOutput: request.input.structuredOutput,
      timeoutMs: request.input.timeoutMs,
      input: request.input.input ?? request.input,
      context: {
        executionScope: request.requestType,
        securityContext: {
          actorUserId: request.context.actorUserId,
          permissions: request.context.permissions,
        },
        operationalMetadata: request.context.metadata,
        traceId: request.context.requestId,
      },
      metadata: {
        executionRequestId: request.id,
        idempotencyKey: request.idempotencyKey,
      },
    };
  }

  private toPlatformResponse(
    response: RuntimeRestExecutionResponse,
    context: TenantExecutionContext,
  ): ExecutionResponseContract {
    return {
      id: response.executionId,
      tenantId: response.tenantId,
      moduleSlug: context.moduleSlug,
      status: this.toPlatformStatus(response.status),
      output: {
        provider: response.provider,
        model: response.model,
        output: response.output,
        structuredPayload: response.structuredPayload,
        usage: response.usage,
        latencyMs: response.latencyMs,
        metadata: response.metadata,
      },
      errorMessage: response.error,
      startedAt: response.startedAt,
      completedAt: response.completedAt,
    };
  }

  private toPlatformStatus(status: RuntimeRestExecutionResponse['status']): ExecutionResponseContract['status'] {
    return {
      succeeded: 'SUCCEEDED',
      failed: 'FAILED',
      cancelled: 'CANCELLED',
      timed_out: 'TIMED_OUT',
    }[status] as ExecutionResponseContract['status'];
  }
}
