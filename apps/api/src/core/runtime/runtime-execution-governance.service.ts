import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ExecutionStatus,
  ModuleCatalogStatus,
  TenantModuleStatus,
} from '@prisma/client';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';

const MODULE_EXECUTION_TYPES: Readonly<Record<string, ReadonlyArray<string>>> = {
  pulse: [
    'pulse.classify_intent',
    'pulse.extract_operational_state',
    'pulse.advance_flow',
    'pulse.operator_review',
    'pulse.knowledge_answer',
    'pulse.schedule_action',
    'pulse.marketing_action',
  ],
};

@Injectable()
export class RuntimeExecutionGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: RuntimeExecutionLifecycleService,
    private readonly audit: AuditService,
  ) {}

  async approveAndQueue(input: {
    tenantId: string;
    executionId: string;
    moduleSlug: string;
    requestType: string;
    actorUserId?: string;
  }) {
    await this.assertModuleEnabledForTenant(input);
    await this.assertRequestTypeAllowed(input);

    const queued = await this.lifecycle.transition({
      tenantId: input.tenantId,
      executionId: input.executionId,
      actorUserId: input.actorUserId,
      status: ExecutionStatus.QUEUED,
      output: {
        governance: {
          approved: true,
          moduleSlug: input.moduleSlug,
          requestType: input.requestType,
        },
      },
    });

    await this.audit.record({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      action: AuditAction.RUNTIME_EXECUTION_GOVERNANCE_APPROVED,
      resourceType: 'ExecutionRequest',
      resourceId: input.executionId,
      metadata: {
        moduleSlug: input.moduleSlug,
        requestType: input.requestType,
        status: queued.status,
      },
    });

    return queued;
  }

  private async assertModuleEnabledForTenant(input: {
    tenantId: string;
    executionId: string;
    moduleSlug: string;
    requestType: string;
    actorUserId?: string;
  }) {
    const module = await this.prisma.moduleCatalogItem.findUnique({
      where: { slug: input.moduleSlug },
      select: {
        id: true,
        slug: true,
        status: true,
        active: true,
      },
    });
    const allowed = Boolean(module?.active && module.status === ModuleCatalogStatus.PUBLIC);
    const installation = module
      ? await this.prisma.tenantModuleInstallation.findUnique({
          where: {
            tenantId_moduleId: {
              tenantId: input.tenantId,
              moduleId: module.id,
            },
          },
          select: { status: true },
        })
      : null;

    if (allowed && installation?.status === TenantModuleStatus.ENABLED) {
      return;
    }

    await this.recordDenied(input, 'module_not_enabled_for_tenant');
    throw new ForbiddenException('Runtime execution denied: module is not enabled for tenant.');
  }

  private async assertRequestTypeAllowed(input: {
    tenantId: string;
    executionId: string;
    moduleSlug: string;
    requestType: string;
    actorUserId?: string;
  }) {
    const allowed = MODULE_EXECUTION_TYPES[input.moduleSlug];
    if (allowed?.includes(input.requestType)) {
      return;
    }

    await this.recordDenied(input, 'request_type_not_allowed');
    throw new ForbiddenException('Runtime execution denied: request type is not allowed for module.');
  }

  private async recordDenied(
    input: {
      tenantId: string;
      executionId: string;
      moduleSlug: string;
      requestType: string;
      actorUserId?: string;
    },
    reason: string,
  ) {
    await this.audit.record({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      action: AuditAction.RUNTIME_EXECUTION_GOVERNANCE_DENIED,
      resourceType: 'ExecutionRequest',
      resourceId: input.executionId,
      metadata: {
        moduleSlug: input.moduleSlug,
        requestType: input.requestType,
        reason,
      },
    });
  }
}
