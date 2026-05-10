import { Permission } from '@synapse/contracts';
import { PulseActionJob } from '../../infrastructure/queues/pulse-queue.contracts';

export interface PulseActionHandlerResult {
  sideEffectsApplied: boolean;
  result: Record<string, unknown>;
}

export type PulseActionFailureClass =
  | 'retryable'
  | 'non_retryable_governance'
  | 'non_retryable_validation';

export interface PulseActionDefinition {
  action: string;
  permissions: Permission[];
  validationFailureClass: PulseActionFailureClass;
  usageCandidate?: string;
}

export interface PulseActionHandler {
  readonly action: string;
  readonly definition: PulseActionDefinition;
  canHandle(action: string): boolean;
  execute(job: PulseActionJob): Promise<PulseActionHandlerResult>;
}
