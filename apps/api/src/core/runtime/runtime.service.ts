import { Injectable } from '@nestjs/common';
import type { TenantRuntimeModuleSpec, TenantRuntimeSpec } from '@synapse/contracts';
import { StubPainClient } from './pain/stub-pain.client';

@Injectable()
export class RuntimeService {
  private readonly specs = new Map<string, TenantRuntimeSpec>();

  constructor(private readonly painClient: StubPainClient) {}

  getRuntimeSpec(tenantId: string): TenantRuntimeSpec {
    return this.specs.get(tenantId) ?? {
      tenantId,
      plan: 'starter',
      modules: []
    };
  }

  async applyRuntimeSpec(spec: TenantRuntimeSpec) {
    this.specs.set(spec.tenantId, spec);
    await this.painClient.applyRuntime(spec);
    return spec;
  }

  async setModuleState(
    tenantId: string,
    moduleName: string,
    enabled: boolean,
    config?: Record<string, unknown>
  ): Promise<TenantRuntimeSpec> {
    const current = this.getRuntimeSpec(tenantId);
    const modules = this.upsertModule(current.modules, {
      name: moduleName,
      enabled,
      config
    });

    return this.applyRuntimeSpec({
      ...current,
      modules
    });
  }

  preparePainCommand(spec: TenantRuntimeSpec) {
    return {
      command: 'applyRuntime',
      target: 'pain-runtime-operator',
      spec
    };
  }

  getStatus(tenantId: string) {
    return this.painClient.getStatus(tenantId);
  }

  private upsertModule(modules: TenantRuntimeModuleSpec[], next: TenantRuntimeModuleSpec) {
    const existing = modules.find((module) => module.name === next.name);
    if (!existing) {
      return [...modules, next];
    }

    return modules.map((module) => module.name === next.name ? { ...module, ...next } : module);
  }
}
