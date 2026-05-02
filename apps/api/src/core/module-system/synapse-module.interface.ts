import type { ModuleAction, ModuleEvent, SynapseModuleManifest } from '@synapse/contracts';
import { SynapseCoreService } from './synapse-core.service';

export type SynapseModule = SynapseModuleManifest & {
  register(core: SynapseCoreService): void | Promise<void>;
  actions: ModuleAction[];
  events?: ModuleEvent[];
  permissions?: string[];
};
