import { Module } from '@nestjs/common';
import { QueueModule } from '../../modules/queue/queue.module';
import { BillingModule } from '../../modules/billing/billing.module';
import { PulseSynapseModule } from '../../product-modules/pulse/pulse.synapse-module';
import { RuntimeModule } from '../runtime/runtime.module';
import { ModuleRegistryController } from './module-registry.controller';
import { ModuleRegistryService } from './module-registry.service';
import { SynapseCoreService } from './synapse-core.service';

@Module({
  imports: [QueueModule, RuntimeModule, BillingModule],
  controllers: [ModuleRegistryController],
  providers: [SynapseCoreService, ModuleRegistryService, PulseSynapseModule],
  exports: [SynapseCoreService, ModuleRegistryService]
})
export class ModuleSystemModule {}
