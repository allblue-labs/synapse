import { PulseActionJob } from '../../infrastructure/queues/pulse-queue.contracts';

export interface PulseActionHandlerResult {
  sideEffectsApplied: boolean;
  result: Record<string, unknown>;
}

export interface PulseActionHandler {
  canHandle(action: string): boolean;
  execute(job: PulseActionJob): Promise<PulseActionHandlerResult>;
}
