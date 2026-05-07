import type {
  ExecutionRequestContract,
  ExecutionResponseContract,
  TenantExecutionContext,
} from '@synapse/contracts';

export type RuntimeTransport = 'local' | 'queue' | 'grpc';

export interface RuntimeExecutionProvider {
  readonly transport: RuntimeTransport;
  submit(request: ExecutionRequestContract): Promise<ExecutionResponseContract>;
  cancel(context: TenantExecutionContext, executionId: string): Promise<ExecutionResponseContract>;
}

export interface RuntimeExecutionLifecycleStore {
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
    output?: Record<string, unknown>;
    errorMessage?: string;
  }): Promise<ExecutionResponseContract>;
}
