import type { TenantRuntimeSpec, TenantRuntimeStatus } from '@synapse/contracts';

export interface PainClient {
  applyRuntime(spec: TenantRuntimeSpec): Promise<void>;
  destroyRuntime(tenantId: string): Promise<void>;
  getStatus(tenantId: string): Promise<TenantRuntimeStatus>;
}
