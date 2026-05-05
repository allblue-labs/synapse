import { Injectable, OnModuleInit } from '@nestjs/common';
import { SynapseCoreService } from './synapse-core.service';
import { MessagingSynapseModule } from '../../product-modules/messaging/messaging.synapse-module';

@Injectable()
export class ModuleRegistryService implements OnModuleInit {
  constructor(
    private readonly core: SynapseCoreService,
    private readonly messagingModule: MessagingSynapseModule
  ) {}

  async onModuleInit() {
    await this.messagingModule.register(this.core);
  }

  list() {
    return this.core.listModules();
  }

  enable(tenantId: string, name: string) {
    return this.core.enableModule(name, tenantId);
  }

  disable(tenantId: string, name: string) {
    return this.core.disableModule(name, tenantId);
  }
}
