import { Injectable } from '@nestjs/common';
import type { RegisteredModule } from '@synapse/contracts';
import { JsonLoggerService } from '../../common/logging/json-logger.service';
import { QueueService } from '../../modules/queue/queue.service';

@Injectable()
export class SynapseCoreService {
  private readonly modules = new Map<string, RegisteredModule>();

  constructor(
    private readonly logger: JsonLoggerService,
    private readonly queues: QueueService
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

  enableModule(name: string) {
    const module = this.modules.get(name);
    if (!module) {
      return undefined;
    }

    const enabled = { ...module, enabled: true };
    this.modules.set(name, enabled);
    return enabled;
  }

  disableModule(name: string) {
    const module = this.modules.get(name);
    if (!module) {
      return undefined;
    }

    const disabled = { ...module, enabled: false };
    this.modules.set(name, disabled);
    return disabled;
  }

  listModules() {
    return Array.from(this.modules.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  get queue() {
    return this.queues;
  }
}
