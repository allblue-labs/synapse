import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthRole, ExecutionResponseContract, Permission } from '@synapse/contracts';
import { PermissionResolverService } from '../../../../common/authorization';
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
    private readonly permissions: PermissionResolverService,
  ) {}

  async execute(input: IngestPulseRuntimeResultInput): Promise<IngestPulseRuntimeResultOutput> {
    const request = await this.runtimeLifecycle.getRequest(input.tenantId, input.executionRequestId);
    this.assertPulseRequest(request.context.moduleSlug);

    const contextPack = this.extractContextPack(request.input);
    const actorSnapshot = this.extractActorSnapshot(request.context.metadata);

    if (input.status === 'SUCCEEDED') {
      if (!input.output) {
        throw new BadRequestException('Pulse runtime result requires output for successful executions.');
      }

      this.validateOutputAgainstSchema(input.output, contextPack.requiredOutputSchema);
    }

    const execution = await this.runtimeLifecycle.transition({
      tenantId: input.tenantId,
      executionId: input.executionRequestId,
      status: input.status,
      actorUserId: actorSnapshot.userId,
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

    const output = input.output;
    if (!output) {
      throw new BadRequestException('Pulse runtime result requires output for successful executions.');
    }

    const actor = await this.revalidateActorSnapshot(input.tenantId, actorSnapshot);
    const actionPlan = await this.planActions(input, contextPack, output, actor);

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

  private validateOutputAgainstSchema(output: Record<string, unknown>, schema: Record<string, unknown> | undefined) {
    if (!schema || Object.keys(schema).length === 0) {
      return;
    }

    const properties = this.objectField(schema, 'properties');
    const required = this.stringArrayField(schema, 'required');

    for (const key of required) {
      if (!(key in output)) {
        throw new BadRequestException(`Pulse runtime output is missing required field "${key}".`);
      }
    }

    if (schema.additionalProperties === false && properties) {
      for (const key of Object.keys(output)) {
        if (!(key in properties)) {
          throw new BadRequestException(`Pulse runtime output contains unsupported field "${key}".`);
        }
      }
    }

    if (properties?.decisionSummary) {
      this.validateStringProperty(output, properties, 'decisionSummary');
    }
    if (properties?.confidence) {
      this.validateNumberProperty(output, properties, 'confidence');
    }
    if (properties?.nextState) {
      this.validateStringProperty(output, properties, 'nextState');
    }
    if (properties?.recommendedActions) {
      this.validateRecommendedActions(output, properties);
    }
    if (properties?.executionType && 'executionType' in output) {
      this.validateConstProperty(output, properties, 'executionType');
    }
  }

  private validateStringProperty(
    output: Record<string, unknown>,
    properties: Record<string, unknown>,
    key: string,
  ) {
    const property = this.objectValue(properties[key]);
    const value = output[key];

    if (property.type === 'string' && typeof value !== 'string') {
      throw new BadRequestException(`Pulse runtime output field "${key}" must be a string.`);
    }

    if (typeof value === 'string' && typeof property.maxLength === 'number' && value.length > property.maxLength) {
      throw new BadRequestException(`Pulse runtime output field "${key}" exceeds maxLength.`);
    }
  }

  private validateNumberProperty(
    output: Record<string, unknown>,
    properties: Record<string, unknown>,
    key: string,
  ) {
    const property = this.objectValue(properties[key]);
    const value = output[key];

    if (property.type === 'number' && typeof value !== 'number') {
      throw new BadRequestException(`Pulse runtime output field "${key}" must be a number.`);
    }

    if (typeof value !== 'number') {
      return;
    }

    if (typeof property.minimum === 'number' && value < property.minimum) {
      throw new BadRequestException(`Pulse runtime output field "${key}" is below minimum.`);
    }
    if (typeof property.maximum === 'number' && value > property.maximum) {
      throw new BadRequestException(`Pulse runtime output field "${key}" is above maximum.`);
    }
  }

  private validateRecommendedActions(output: Record<string, unknown>, properties: Record<string, unknown>) {
    const property = this.objectValue(properties.recommendedActions);
    const value = output.recommendedActions;

    if (property.type === 'array' && !Array.isArray(value)) {
      throw new BadRequestException('Pulse runtime output field "recommendedActions" must be an array.');
    }

    if (!Array.isArray(value)) {
      return;
    }

    if (typeof property.maxItems === 'number' && value.length > property.maxItems) {
      throw new BadRequestException('Pulse runtime output field "recommendedActions" exceeds maxItems.');
    }

    const itemSchema = this.objectField(property, 'items');
    const allowed = itemSchema ? this.stringArrayField(itemSchema, 'enum') : [];

    for (const item of value) {
      if (typeof item !== 'string') {
        throw new BadRequestException('Pulse runtime output field "recommendedActions" must contain strings.');
      }
      if (allowed.length > 0 && !allowed.includes(item)) {
        throw new BadRequestException(`Pulse runtime output recommends unsupported action "${item}".`);
      }
    }
  }

  private validateConstProperty(
    output: Record<string, unknown>,
    properties: Record<string, unknown>,
    key: string,
  ) {
    const property = this.objectValue(properties[key]);
    if ('const' in property && output[key] !== property.const) {
      throw new BadRequestException(`Pulse runtime output field "${key}" does not match the expected value.`);
    }
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

  private async revalidateActorSnapshot(
    tenantId: string,
    actor: {
      userId: string;
      email: string;
      role: AuthRole;
      permissions: Permission[];
    },
  ) {
    const resolved = await this.permissions.resolve({
      sub: actor.userId,
      email: actor.email,
      role: actor.role,
      tenantId,
    }, tenantId);

    return {
      ...actor,
      role: resolved.role ?? actor.role,
      permissions: [...resolved.permissions],
    };
  }

  private async planActions(
    input: IngestPulseRuntimeResultInput,
    contextPack: PulseContextPack,
    output: Record<string, unknown>,
    actor: {
      userId: string;
      email: string;
      role: AuthRole;
      permissions: Permission[];
    },
  ): Promise<PulseRuntimeActionPlannerResult> {
    try {
      return await this.planner.plan({
        tenantId: input.tenantId,
        executionRequestId: input.executionRequestId,
        ticketId: this.stringField(contextPack.ticketState, 'id'),
        conversationId: this.stringField(contextPack.conversationState, 'id'),
        allowedActions: contextPack.allowedActions,
        output,
        actor,
        traceId: input.traceId,
      });
    } catch (err) {
      if (err instanceof ForbiddenException) {
        return {
          enqueued: [],
          skipped: [{ action: 'runtime.output', reason: 'actor_permission_revalidation_failed' }],
        };
      }
      throw err;
    }
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

  private objectField(value: Record<string, unknown>, key: string) {
    return this.objectValue(value[key]);
  }

  private objectValue(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private stringArrayField(value: Record<string, unknown>, key: string) {
    const result = value[key];
    if (!Array.isArray(result)) {
      return [];
    }
    return result.filter((item): item is string => typeof item === 'string');
  }
}
