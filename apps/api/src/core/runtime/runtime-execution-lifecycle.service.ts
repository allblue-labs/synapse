import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExecutionStatus, Prisma } from '@prisma/client';
import type {
  ExecutionRequestContract,
  ExecutionResponseContract,
  TenantExecutionContext,
} from '@synapse/contracts';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RuntimeExecutionLifecycleStore } from './contracts/runtime-execution.contracts';

@Injectable()
export class RuntimeExecutionLifecycleService implements RuntimeExecutionLifecycleStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async request(input: {
    context: TenantExecutionContext;
    requestType: string;
    idempotencyKey?: string;
    input: Record<string, unknown>;
  }): Promise<ExecutionRequestContract> {
    const context = this.withActorSnapshot(input.context);
    const data = {
      tenantId: context.tenantId,
      moduleSlug: context.moduleSlug,
      requestType: input.requestType,
      status: ExecutionStatus.REQUESTED,
      idempotencyKey: input.idempotencyKey,
      context: this.maskSensitive(context) as Prisma.InputJsonValue,
      input: this.maskSensitive(input.input) as Prisma.InputJsonValue,
    };

    const record = input.idempotencyKey
      ? await this.prisma.executionRequest.upsert({
        where: {
          tenantId_idempotencyKey: {
            tenantId: input.context.tenantId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        create: data,
        update: {},
      })
      : await this.prisma.executionRequest.create({ data });

    await this.audit.record({
      tenantId: input.context.tenantId,
      actorUserId: input.context.actorUserId ?? null,
      action: AuditAction.RUNTIME_EXECUTION_REQUESTED,
      resourceType: 'ExecutionRequest',
      resourceId: record.id,
      metadata: {
        moduleSlug: input.context.moduleSlug,
        requestType: input.requestType,
        idempotencyKey: input.idempotencyKey,
      },
    });

    return this.toRequestContract(record);
  }

  async get(tenantId: string, executionId: string): Promise<ExecutionResponseContract> {
    const record = await this.prisma.executionRequest.findFirst({
      where: { tenantId, id: executionId },
    });
    if (!record) {
      throw new NotFoundException('Runtime execution request not found.');
    }
    return this.toResponseContract(record);
  }

  async getRequest(tenantId: string, executionId: string): Promise<ExecutionRequestContract> {
    const record = await this.prisma.executionRequest.findFirst({
      where: { tenantId, id: executionId },
    });
    if (!record) {
      throw new NotFoundException('Runtime execution request not found.');
    }
    return this.toRequestContract(record);
  }

  async transition(input: {
    tenantId: string;
    executionId: string;
    status: ExecutionResponseContract['status'];
    actorUserId?: string;
    output?: Record<string, unknown>;
    errorMessage?: string;
  }): Promise<ExecutionResponseContract> {
    const current = await this.prisma.executionRequest.findFirst({
      where: { tenantId: input.tenantId, id: input.executionId },
    });
    if (!current) {
      throw new NotFoundException('Runtime execution request not found.');
    }
    if (current.status === input.status) {
      return this.toResponseContract(current);
    }
    this.assertAllowedTransition(current.status, input.status);

    const now = new Date();
    const record = await this.prisma.executionRequest.update({
      where: { id: current.id },
      data: {
        status: input.status,
        output: this.maskSensitive(input.output) as Prisma.InputJsonValue | undefined,
        errorMessage: input.errorMessage,
        queuedAt: input.status === ExecutionStatus.QUEUED ? now : undefined,
        startedAt: input.status === ExecutionStatus.RUNNING ? now : undefined,
        completedAt: this.isTerminal(input.status) ? now : undefined,
      },
    });
    await this.audit.record({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      action: AuditAction.RUNTIME_EXECUTION_TRANSITIONED,
      resourceType: 'ExecutionRequest',
      resourceId: record.id,
      metadata: {
        fromStatus: current.status,
        toStatus: input.status,
        moduleSlug: record.moduleSlug,
        hasOutput: input.output !== undefined,
        hasErrorMessage: Boolean(input.errorMessage),
      },
    });
    return this.toResponseContract(record);
  }

  async cancel(input: {
    tenantId: string;
    executionId: string;
    actorUserId?: string;
    reason?: string;
  }): Promise<ExecutionResponseContract> {
    const result = await this.transition({
      tenantId: input.tenantId,
      executionId: input.executionId,
      actorUserId: input.actorUserId,
      status: ExecutionStatus.CANCELLED,
      errorMessage: input.reason,
    });
    await this.audit.record({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      action: AuditAction.RUNTIME_EXECUTION_CANCELLED,
      resourceType: 'ExecutionRequest',
      resourceId: result.id,
      metadata: {
        moduleSlug: result.moduleSlug,
        reason: input.reason,
      },
    });
    return result;
  }

  private assertAllowedTransition(from: ExecutionStatus, to: ExecutionStatus) {
    const allowedTransitions: Record<ExecutionStatus, ExecutionStatus[]> = {
      [ExecutionStatus.REQUESTED]: [
        ExecutionStatus.QUEUED,
        ExecutionStatus.RUNNING,
        ExecutionStatus.FAILED,
        ExecutionStatus.CANCELLED,
      ],
      [ExecutionStatus.QUEUED]: [
        ExecutionStatus.RUNNING,
        ExecutionStatus.FAILED,
        ExecutionStatus.CANCELLED,
        ExecutionStatus.TIMED_OUT,
      ],
      [ExecutionStatus.RUNNING]: [
        ExecutionStatus.SUCCEEDED,
        ExecutionStatus.FAILED,
        ExecutionStatus.CANCELLED,
        ExecutionStatus.TIMED_OUT,
      ],
      [ExecutionStatus.SUCCEEDED]: [],
      [ExecutionStatus.FAILED]: [],
      [ExecutionStatus.CANCELLED]: [],
      [ExecutionStatus.TIMED_OUT]: [],
    };

    if (!allowedTransitions[from]?.includes(to)) {
      throw new BadRequestException(`Invalid runtime execution transition: ${from} -> ${to}.`);
    }
  }

  private isTerminal(status: ExecutionStatus) {
    const terminalStatuses: ExecutionStatus[] = [
      ExecutionStatus.SUCCEEDED,
      ExecutionStatus.FAILED,
      ExecutionStatus.CANCELLED,
      ExecutionStatus.TIMED_OUT,
    ];
    return terminalStatuses.includes(status);
  }

  private maskSensitive(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.maskSensitive(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        this.isSensitiveKey(key) ? '[REDACTED]' : this.maskSensitive(item),
      ]),
    );
  }

  private isSensitiveKey(key: string) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return [
      'apikey',
      'authorization',
      'chainofthought',
      'clientsecret',
      'credential',
      'credentialref',
      'password',
      'providersecret',
      'rawproviderpayload',
      'reasoning',
      'secret',
      'token',
    ].some((sensitive) => normalized.includes(sensitive));
  }

  private withActorSnapshot(context: TenantExecutionContext): TenantExecutionContext {
    if (!context.actorUserId && !context.permissions?.length) {
      return context;
    }

    return {
      ...context,
      metadata: {
        ...(context.metadata ?? {}),
        actorSnapshot: {
          userId: context.actorUserId,
          permissions: context.permissions ?? [],
          ...(this.objectValue(context.metadata?.actorSnapshot) ?? {}),
        },
      },
    };
  }

  private objectValue(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }

  private toRequestContract(record: {
    id: string;
    context: Prisma.JsonValue;
    requestType: string;
    idempotencyKey: string | null;
    input: Prisma.JsonValue;
    requestedAt: Date;
  }): ExecutionRequestContract {
    return {
      id: record.id,
      context: record.context as TenantExecutionContext,
      requestType: record.requestType,
      idempotencyKey: record.idempotencyKey ?? undefined,
      input: record.input as Record<string, unknown>,
      requestedAt: record.requestedAt.toISOString(),
    };
  }

  private toResponseContract(record: {
    id: string;
    tenantId: string;
    moduleSlug: string;
    status: ExecutionStatus;
    output: Prisma.JsonValue | null;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
  }): ExecutionResponseContract {
    return {
      id: record.id,
      tenantId: record.tenantId,
      moduleSlug: record.moduleSlug,
      status: record.status,
      output: record.output as Record<string, unknown> | undefined,
      errorMessage: record.errorMessage ?? undefined,
      startedAt: record.startedAt?.toISOString(),
      completedAt: record.completedAt?.toISOString(),
    };
  }
}
