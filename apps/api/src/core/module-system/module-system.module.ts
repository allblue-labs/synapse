import { Module } from '@nestjs/common';
import { QueueModule } from '../../modules/queue/queue.module';
import { MessagingSynapseModule } from '../../product-modules/messaging/messaging.synapse-module';
import { ModuleRegistryController } from './module-registry.controller';
import { ModuleRegistryService } from './module-registry.service';
import { SynapseCoreService } from './synapse-core.service';

@Module({
  imports: [QueueModule],
  controllers: [ModuleRegistryController],
  providers: [SynapseCoreService, ModuleRegistryService, MessagingSynapseModule],
  exports: [SynapseCoreService, ModuleRegistryService]
})
export class ModuleSystemModule {}
