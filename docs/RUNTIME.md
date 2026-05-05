# Runtime Architecture

Synapse is the control plane. Pain Runtime Operator is the future execution plane.

## Control Plane Responsibilities

Synapse owns:

- tenants
- module lifecycle
- permissions and entitlements
- task intent
- desired tenant runtime specs
- local execution fallback

## Execution Plane Responsibilities

Pain will own:

- per-tenant Kubernetes runtime reconciliation
- distributed execution infrastructure
- runtime status reporting

Synapse does not implement Kubernetes logic.

## Task Execution

All execution intent should be represented as a shared `Task`:

```ts
type Task = {
  id: string;
  type: 'llm' | 'workflow' | 'message' | 'analysis';
  tenantId: string;
  module: string;
  payload: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
};
```

Executors implement:

```ts
interface TaskExecutor {
  execute(task: Task): Promise<TaskResult>;
}
```

Current executors:

- `LocalExecutor`: active implementation for local Synapse execution.
- `PainExecutor`: placeholder that preserves the future integration boundary.

## Tenant Runtime Spec

`TenantRuntimeSpec` represents desired per-tenant infrastructure:

```ts
type TenantRuntimeSpec = {
  tenantId: string;
  plan: string;
  modules: Array<{
    name: string;
    enabled: boolean;
    config?: Record<string, unknown>;
  }>;
};
```

## Pain Client

The Pain adapter contract is:

```ts
interface PainClient {
  applyRuntime(spec: TenantRuntimeSpec): Promise<void>;
  destroyRuntime(tenantId: string): Promise<void>;
  getStatus(tenantId: string): Promise<unknown>;
}
```

`StubPainClient` is a no-op logger. It does not call Pain or Kubernetes.

## Future Integration Path

1. Persist tenant runtime specs.
2. Replace or configure the stub client with a real Pain API client.
3. Switch selected task types from `LocalExecutor` to `PainExecutor`.
4. Add runtime status reconciliation and UI.
