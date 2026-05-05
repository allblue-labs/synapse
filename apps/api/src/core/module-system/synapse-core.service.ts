import { Injectable } from '@nestjs/common';
import type { RegisteredModule } from '@synapse/contracts';
import { JsonLoggerService } from '../../common/logging/json-logger.service';
import { QueueService } from '../../modules/queue/queue.service';
import { RuntimeService } from '../runtime/runtime.service';

@Injectable()
export class SynapseCoreService {
  private readonly modules = new Map<string, RegisteredModule>();

  constructor(
    private readonly logger: JsonLoggerService,
    private readonly queues: QueueService,
    private readonly runtime: RuntimeService
  ) {}

  registerModule(module: Omit<RegisteredModule, 'enabled' | 'registeredAt'>) {
    const registered: RegisteredModule = {
      ...module,
      enabled: true,
      registeredAt: new Date().toISOString()
    };

    this.modules.set(module.name, registered);
    this.logger.write({
      level: 'log',
      context: 'ModuleSystem',
      message: 'module_registered',
      metadata: {
        moduleName: module.name,
        version: module.version
      }
    });

    return registered;
  }

  async enableModule(name: string, tenantId = 'system') {
    const module = this.modules.get(name);
    if (!module) {
      return undefined;
    }

    const enabled = { ...module, enabled: true };
    this.modules.set(name, enabled);
    await this.runtime.setModuleState(tenantId, name, true);
    return enabled;
  }

  async disableModule(name: string, tenantId = 'system') {
    const module = this.modules.get(name);
    if (!module) {
      return undefined;
    }

    const disabled = { ...module, enabled: false };
    this.modules.set(name, disabled);
    await this.runtime.setModuleState(tenantId, name, false);
    return disabled;
  }

  listModules() {
    return Array.from(this.modules.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  get queue() {
    return this.queues;
  }

  get runtimeState() {
    return this.runtime;
  }
}
