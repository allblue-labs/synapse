import { ForbiddenException, Injectable } from '@nestjs/common';
import { Permission } from '@synapse/contracts';
import { PulseQueueService } from '../../infrastructure/queues/pulse-queue.service';
import { PulseActionJob } from '../../infrastructure/queues/pulse-queue.contracts';

type ActionGovernanceRule = {
  permissions: Permission[];
};

const ACTION_RULES: Readonly<Record<string, ActionGovernanceRule>> = {
  'ticket.advance_flow': {
    permissions: ['tickets:write'],
  },
};

@Injectable()
export class PulseActionGovernanceService {
  constructor(private readonly queues: PulseQueueService) {}

  async enqueue(input: Omit<PulseActionJob, 'requestedAt' | 'idempotencyKey'> & {
    idempotencyKey?: string;
  }) {
    const rule = ACTION_RULES[input.action];
    if (!rule) {
      throw new ForbiddenException(`Pulse action is not governed for enqueue: ${input.action}`);
    }
    if (!input.actor) {
      throw new ForbiddenException(`Pulse action requires actor metadata: ${input.action}`);
    }

    const missing = rule.permissions.filter((permission) => !input.actor?.permissions.includes(permission));
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
