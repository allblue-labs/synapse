import { Injectable } from '@nestjs/common';
import { Prisma, PulseActionExecutionStatus } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  BeginPulseActionExecutionInput,
  IPulseActionExecutionRepository,
} from '../../domain/ports/pulse-action-execution-repository.port';

@Injectable()
export class PulseActionExecutionRepository implements IPulseActionExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async begin(input: BeginPulseActionExecutionInput) {
    try {
      const record = await this.prisma.pulseActionExecution.create({
        data: {
          tenantId: input.tenantId,
          action: input.action,
          idempotencyKey: input.idempotencyKey,
          ticketId: input.ticketId ?? null,
          conversationId: input.conversationId ?? null,
          metadata: input.metadata ?? {},
        },
        select: this.select(),
      });

      return { state: 'claimed' as const, record };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }
    }

    const existing = await this.prisma.pulseActionExecution.findUniqueOrThrow({
      where: {
        tenantId_idempotencyKey: {
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: this.select(),
    });

    if (existing.status === PulseActionExecutionStatus.SUCCEEDED) {
      return { state: 'already_succeeded' as const, record: existing };
    }

    if (existing.status === PulseActionExecutionStatus.FAILED) {
      const restarted = await this.prisma.pulseActionExecution.update({
        where: {
          tenantId_idempotencyKey: {
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        data: {
          status: PulseActionExecutionStatus.STARTED,
          attempts: { increment: 1 },
          errorMessage: null,
          failedAt: null,
          startedAt: new Date(),
          metadata: this.mergeMetadata(existing.metadata, input.metadata),
        },
        select: this.select(),
      });

      return { state: 'claimed' as const, record: restarted };
    }

    return { state: 'in_progress' as const, record: existing };
  }

  async markSucceeded(tenantId: string, idempotencyKey: string, metadata: Prisma.InputJsonValue = {}) {
    await this.prisma.pulseActionExecution.update({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey,
        },
      },
      data: {
        status: PulseActionExecutionStatus.SUCCEEDED,
        completedAt: new Date(),
        errorMessage: null,
        metadata,
      },
    });
  }

  async markFailed(
    tenantId: string,
    idempotencyKey: string,
    errorMessage: string,
    metadata: Prisma.InputJsonValue = {},
  ) {
    await this.prisma.pulseActionExecution.update({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey,
        },
      },
      data: {
        status: PulseActionExecutionStatus.FAILED,
        failedAt: new Date(),
        errorMessage,
        metadata,
      },
    });
  }

  private select() {
    return {
      id: true,
      tenantId: true,
      action: true,
      idempotencyKey: true,
      ticketId: true,
      conversationId: true,
      status: true,
      attempts: true,
      metadata: true,
      errorMessage: true,
    } satisfies Prisma.PulseActionExecutionSelect;
  }

  private mergeMetadata(existing: Prisma.JsonValue, next: Prisma.InputJsonValue = {}) {
    const existingObject = this.objectFromJson(existing);
    const nextObject = this.objectFromJson(next as Prisma.JsonValue);
    return {
      ...existingObject,
      ...nextObject,
    } as Prisma.InputJsonValue;
  }

  private objectFromJson(value: Prisma.JsonValue): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private isUniqueConstraintError(error: unknown) {
    return !!error && typeof error === 'object' && 'code' in error && error.code === 'P2002';
  }
}
