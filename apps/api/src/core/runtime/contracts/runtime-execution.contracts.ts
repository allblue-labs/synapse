import type {
  ExecutionRequestContract,
  ExecutionResponseContract,
  TenantExecutionContext,
} from '@synapse/contracts';

export type RuntimeTransport = 'local' | 'http' | 'queue' | 'grpc';

export interface RuntimeExecutionProvider {
  readonly transport: RuntimeTransport;
  submit(request: ExecutionRequestContract): Promise<ExecutionResponseContract>;
  cancel(context: TenantExecutionContext, executionId: string): Promise<ExecutionResponseContract>;
}

export type RuntimeLifecycleCallbackContract = {
  executionId: string;
  tenantId: string;
  status: ExecutionResponseContract['status'];
  provider?: string;
  model?: string;
  output?: Record<string, unknown>;
  errorMessage?: string;
  usage?: Record<string, unknown>;
  latencyMs?: number;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export interface RuntimeExecutionLifecycleStore {
  getRequest(tenantId: string, executionId: string): Promise<ExecutionRequestContract>;
  request(input: {
    context: TenantExecutionContext;
    requestType: string;
    idempotencyKey?: string;
    input: Record<string, unknown>;
  }): Promise<ExecutionRequestContract>;
  transition(input: {
    tenantId: string;
    executionId: string;
    status: ExecutionResponseContract['status'];
    actorUserId?: string;
    output?: Record<string, unknown>;
    errorMessage?: string;
  }): Promise<ExecutionResponseContract>;
  cancel(input: {
    tenantId: string;
    executionId: string;
    actorUserId?: string;
    reason?: string;
  }): Promise<ExecutionResponseContract>;
}
