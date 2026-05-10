import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthRole, ExecutionResponseContract, Permission } from '@synapse/contracts';
import { RuntimeExecutionLifecycleService } from '../../../../core/runtime/runtime-execution-lifecycle.service';
import { PULSE_CONTEXT_PACK_VERSION, PulseContextPack } from '../../contracts/pulse.contracts';
import { PULSE_EVENT_TYPES } from '../../domain/pulse-event-types';
import { PulseRuntimeActionPlannerService, PulseRuntimeActionPlannerResult } from '../actions/pulse-runtime-action-planner.service';
import { PULSE_QUEUES } from '../../infrastructure/queues/pulse-queue.contracts';
import { PulseQueueService } from '../../infrastructure/queues/pulse-queue.service';

export interface IngestPulseRuntimeResultInput {
  tenantId: string;
  executionRequestId: string;
  status: ExecutionResponseContract['status'];
  output?: Record<string, unknown>;
  errorMessage?: string;
  traceId?: string;
}

export interface IngestPulseRuntimeResultOutput {
  execution: ExecutionResponseContract;
  actionPlan: PulseRuntimeActionPlannerResult;
}

@Injectable()
export class IngestPulseRuntimeResultUseCase {
  constructor(
    private readonly runtimeLifecycle: RuntimeExecutionLifecycleService,
    private readonly planner: PulseRuntimeActionPlannerService,
    private readonly queues: PulseQueueService,
  ) {}

  async execute(input: IngestPulseRuntimeResultInput): Promise<IngestPulseRuntimeResultOutput> {
    const request = await this.runtimeLifecycle.getRequest(input.tenantId, input.executionRequestId);
    this.assertPulseRequest(request.context.moduleSlug);

    const contextPack = this.extractContextPack(request.input);
    const actor = this.extractActorSnapshot(request.context.metadata);
    const execution = await this.runtimeLifecycle.transition({
      tenantId: input.tenantId,
      executionId: input.executionRequestId,
      status: input.status,
      actorUserId: actor.userId,
      output: input.output,
      errorMessage: input.errorMessage,
    });

    if (input.status !== 'SUCCEEDED') {
      const actionPlan = {
        enqueued: [],
        skipped: [{ action: 'runtime.output', reason: 'execution_not_succeeded' }],
      };
      await this.recordResult(input, execution, actionPlan);
      return { execution, actionPlan };
    }

    if (!input.output) {
      throw new BadRequestException('Pulse runtime result requires output for successful executions.');
    }

    const actionPlan = await this.planner.plan({
      tenantId: input.tenantId,
      executionRequestId: input.executionRequestId,
      ticketId: this.stringField(contextPack.ticketState, 'id'),
      conversationId: this.stringField(contextPack.conversationState, 'id'),
      allowedActions: contextPack.allowedActions,
      output: input.output,
      actor,
      traceId: input.traceId,
    });

    await this.recordResult(input, execution, actionPlan);
    await this.recordActionPlan(input, contextPack, actionPlan);
    return { execution, actionPlan };
  }

  private assertPulseRequest(moduleSlug: string) {
    if (moduleSlug !== 'pulse') {
      throw new BadRequestException('Runtime execution request does not belong to Pulse.');
    }
  }

  private extractContextPack(input: Record<string, unknown>): PulseContextPack {
    const value = input.contextPack;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Pulse runtime execution request is missing contextPack.');
    }

    const contextPack = value as Partial<PulseContextPack>;
    if (
      contextPack.version !== PULSE_CONTEXT_PACK_VERSION ||
      contextPack.module !== 'pulse' ||
      !Array.isArray(contextPack.allowedActions)
    ) {
      throw new BadRequestException('Pulse runtime execution request has an invalid contextPack.');
    }

    return contextPack as PulseContextPack;
  }

  private extractActorSnapshot(metadata: Record<string, unknown> | undefined) {
    const actor = metadata?.actorSnapshot;
    if (!actor || typeof actor !== 'object' || Array.isArray(actor)) {
      throw new BadRequestException('Pulse runtime execution request is missing actor snapshot.');
    }

    const snapshot = actor as Record<string, unknown>;
    if (
      typeof snapshot.userId !== 'string' ||
      typeof snapshot.email !== 'string' ||
      typeof snapshot.role !== 'string' ||
      !Array.isArray(snapshot.permissions) ||
      !snapshot.permissions.every((permission) => typeof permission === 'string')
    ) {
      throw new BadRequestException('Pulse runtime execution request has an invalid actor snapshot.');
    }

    return {
      userId: snapshot.userId,
      email: snapshot.email,
      role: snapshot.role as AuthRole,
      permissions: snapshot.permissions as Permission[],
    };
  }

  private async recordResult(
    input: IngestPulseRuntimeResultInput,
    execution: ExecutionResponseContract,
    actionPlan: PulseRuntimeActionPlannerResult,
  ) {
    await this.queues.enqueueTimeline({
      tenantId: input.tenantId,
      idempotencyKey: `pulse.timeline:${input.tenantId}:${input.executionRequestId}:runtime-result-ingested`,
      traceId: input.traceId,
      eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_RESULT_INGESTED,
      payload: {
        executionRequestId: input.executionRequestId,
        status: execution.status,
        hasOutput: Boolean(input.output),
        hasErrorMessage: Boolean(input.errorMessage),
        actionPlan: {
          enqueued: actionPlan.enqueued.map((item) => item.action),
          skipped: actionPlan.skipped,
        },
      },
      metadata: {
        source: 'runtime.result',
        runtimeProviderCalls: true,
      },
    });
  }

  private async recordActionPlan(
    input: IngestPulseRuntimeResultInput,
    contextPack: PulseContextPack,
    actionPlan: PulseRuntimeActionPlannerResult,
  ) {
    await this.queues.enqueueTimeline({
      tenantId: input.tenantId,
      idempotencyKey: `pulse.timeline:${input.tenantId}:${input.executionRequestId}:runtime-action-planned`,
      traceId: input.traceId,
      eventType: PULSE_EVENT_TYPES.RUNTIME_ACTION_PLANNED,
      conversationId: this.stringField(contextPack.conversationState, 'id'),
      ticketId: this.stringField(contextPack.ticketState, 'id'),
      payload: {
        executionRequestId: input.executionRequestId,
        enqueued: actionPlan.enqueued,
        skipped: actionPlan.skipped,
      },
      metadata: {
        source: PULSE_QUEUES.ACTIONS,
        contextPackVersion: contextPack.version,
      },
    });
  }

  private stringField(value: Record<string, unknown> | null, key: string) {
    if (!value || typeof value[key] !== 'string') {
      return undefined;
    }
    return value[key] as string;
  }
}
