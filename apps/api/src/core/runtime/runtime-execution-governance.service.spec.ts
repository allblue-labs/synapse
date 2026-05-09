import { ForbiddenException } from '@nestjs/common';
import {
  ExecutionStatus,
  ModuleCatalogStatus,
  TenantModuleStatus,
} from '@prisma/client';
import { AuditAction } from '../../common/audit/audit.service';
import { RuntimeExecutionGovernanceService } from './runtime-execution-governance.service';

describe('RuntimeExecutionGovernanceService', () => {
  const prisma = {
    moduleCatalogItem: {
      findUnique: jest.fn(),
    },
    tenantModuleInstallation: {
      findUnique: jest.fn(),
    },
  };
  const lifecycle = {
    transition: jest.fn(),
  };
  const audit = {
    record: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('approves enabled tenant modules and advances execution to queued', async () => {
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({
      id: 'module-1',
      slug: 'pulse',
      status: ModuleCatalogStatus.PUBLIC,
      active: true,
    });
    prisma.tenantModuleInstallation.findUnique.mockResolvedValue({
      status: TenantModuleStatus.ENABLED,
    });
    lifecycle.transition.mockResolvedValue({
      id: 'exec-1',
      tenantId: 'tenant-1',
      moduleSlug: 'pulse',
      status: ExecutionStatus.QUEUED,
    });

    const service = new RuntimeExecutionGovernanceService(
      prisma as never,
      lifecycle as never,
      audit as never,
    );

    await expect(service.approveAndQueue({
      tenantId: 'tenant-1',
      executionId: 'exec-1',
      moduleSlug: 'pulse',
      requestType: 'pulse.classify_intent',
    })).resolves.toMatchObject({
      status: ExecutionStatus.QUEUED,
    });

    expect(lifecycle.transition).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      executionId: 'exec-1',
      actorUserId: undefined,
      status: ExecutionStatus.QUEUED,
      output: {
        governance: {
          approved: true,
          moduleSlug: 'pulse',
          requestType: 'pulse.classify_intent',
        },
      },
    });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.RUNTIME_EXECUTION_GOVERNANCE_APPROVED,
      resourceId: 'exec-1',
    }));
  });

  it('denies execution when the module is not enabled for the tenant', async () => {
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({
      id: 'module-1',
      slug: 'pulse',
      status: ModuleCatalogStatus.PUBLIC,
      active: true,
    });
    prisma.tenantModuleInstallation.findUnique.mockResolvedValue({
      status: TenantModuleStatus.DISABLED,
    });

    const service = new RuntimeExecutionGovernanceService(
      prisma as never,
      lifecycle as never,
      audit as never,
    );

    await expect(service.approveAndQueue({
      tenantId: 'tenant-1',
      executionId: 'exec-1',
      moduleSlug: 'pulse',
      requestType: 'pulse.classify_intent',
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(lifecycle.transition).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.RUNTIME_EXECUTION_GOVERNANCE_DENIED,
      metadata: expect.objectContaining({
        reason: 'module_not_enabled_for_tenant',
      }),
    }));
  });

  it('denies request types outside the module execution allowlist', async () => {
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({
      id: 'module-1',
      slug: 'pulse',
      status: ModuleCatalogStatus.PUBLIC,
      active: true,
    });
    prisma.tenantModuleInstallation.findUnique.mockResolvedValue({
      status: TenantModuleStatus.ENABLED,
    });

    const service = new RuntimeExecutionGovernanceService(
      prisma as never,
      lifecycle as never,
      audit as never,
    );

    await expect(service.approveAndQueue({
      tenantId: 'tenant-1',
      executionId: 'exec-1',
      moduleSlug: 'pulse',
      requestType: 'pulse.unbounded_provider_call',
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(lifecycle.transition).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.RUNTIME_EXECUTION_GOVERNANCE_DENIED,
      metadata: expect.objectContaining({
        reason: 'request_type_not_allowed',
      }),
    }));
  });
});
