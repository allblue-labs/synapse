import { Injectable } from '@nestjs/common';
import type { TenantRuntimeSpec, TenantRuntimeStatus } from '@synapse/contracts';
import { JsonLoggerService } from '../../../common/logging/json-logger.service';
import { PainClient } from './pain-client.interface';

@Injectable()
export class StubPainClient implements PainClient {
  constructor(private readonly logger: JsonLoggerService) {}

  async applyRuntime(spec: TenantRuntimeSpec): Promise<void> {
    this.logger.write({
      level: 'log',
      context: 'StubPainClient',
      message: 'pain_apply_runtime_noop',
      tenantId: spec.tenantId,
      metadata: {
        plan: spec.plan,
        modules: spec.modules.map((module) => ({ name: module.name, enabled: module.enabled }))
      }
    });
  }

  async destroyRuntime(tenantId: string): Promise<void> {
    this.logger.write({
      level: 'log',
      context: 'StubPainClient',
      message: 'pain_destroy_runtime_noop',
      tenantId
    });
  }

  async getStatus(tenantId: string): Promise<TenantRuntimeStatus> {
    return {
      tenantId,
      state: 'local',
      message: 'Pain integration is configured as a no-op stub.'
    };
  }
}
