import { ForbiddenException, Injectable } from '@nestjs/common';
import { PulseQueueService } from '../../infrastructure/queues/pulse-queue.service';
import { PulseActionJob } from '../../infrastructure/queues/pulse-queue.contracts';
import { PulseActionHandlerRegistry } from './pulse-action-handler.registry';


@Injectable()
export class PulseActionGovernanceService {
  constructor(
    private readonly queues: PulseQueueService,
    private readonly handlers: PulseActionHandlerRegistry,
  ) {}

  async enqueue(input: Omit<PulseActionJob, 'requestedAt' | 'idempotencyKey'> & {
    idempotencyKey?: string;
  }) {
    const definition = this.handlers.definition(input.action);
    if (!definition) {
      throw new ForbiddenException(`Pulse action is not governed for enqueue: ${input.action}`);
    }
    if (!input.actor) {
      throw new ForbiddenException(`Pulse action requires actor metadata: ${input.action}`);
    }

    const missing = definition.permissions.filter((permission) => !input.actor?.permissions.includes(permission));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing required action permission(s): ${missing.join(', ')}`);
    }

    const idempotencyKey = input.idempotencyKey ?? this.idempotencyKey(input);
    return this.queues.enqueueAction({
      ...input,
      idempotencyKey,
      payload: {
        ...input.payload,
        actor: {
          userId: input.actor.userId,
          email: input.actor.email,
          role: input.actor.role,
        },
      },
    });
  }

  private idempotencyKey(input: Omit<PulseActionJob, 'requestedAt' | 'idempotencyKey'>) {
    const resourceId = input.ticketId ?? input.conversationId ?? 'resource';
    return `pulse.actions:${input.tenantId}:${input.action}:${resourceId}`;
  }
}
