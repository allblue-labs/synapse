import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { permissionsForRole, type AuthRole } from '@synapse/contracts';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PermissionsGuard } from '../../common/authorization';
import { PermissionResolverService } from '../../common/authorization/permission-resolver.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PlatformGovernanceController } from './platform-governance.controller';
import { PlatformGovernanceService } from './platform-governance.service';

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      headers: Record<string, string | undefined>;
    }>();
    const role = (request.headers['x-test-role'] ?? 'super_admin') as AuthRole;
    request.user = {
      sub: request.headers['x-test-user-id'] ?? 'user-1',
      tenantId: request.headers['x-test-tenant-id'],
      role,
      email: 'platform@synapse.local',
    };
    return true;
  }
}

describe('Platform governance HTTP guards', () => {
  let app: INestApplication;
  let baseUrl: string;

  const governance = {
    usageMetrics: jest.fn(),
    modules: jest.fn(),
    policies: jest.fn(),
    updateModuleGovernance: jest.fn(),
    updatePolicy: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const permissionResolver = {
    resolve: jest.fn(async (user: AuthenticatedUser) => ({
      role: user.role,
      permissions: permissionsForRole(user.role),
      source: 'platform' as const,
    })),
  };

  async function request(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-test-role': 'super_admin',
        ...(init?.headers ?? {}),
      },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PlatformGovernanceController],
      providers: [
        Reflector,
        { provide: APP_GUARD, useClass: TestAuthGuard },
        { provide: APP_GUARD, useClass: TenantGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
        { provide: AuditService, useValue: audit },
        { provide: PermissionResolverService, useValue: permissionResolver },
        { provide: PlatformGovernanceService, useValue: governance },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    governance.modules.mockResolvedValue([]);
    governance.policies.mockResolvedValue([]);
    governance.usageMetrics.mockResolvedValue({ records: [] });
    governance.updateModuleGovernance.mockResolvedValue({
      slug: 'pulse',
      rolloutState: 'GA',
    });
    governance.updatePolicy.mockResolvedValue({
      key: 'billing.plan.pro.commercial',
      enabled: true,
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('allows super admins to mutate scoped module governance routes', async () => {
    const response = await request('/v1/platform/modules/pulse/governance', {
      method: 'PATCH',
      body: JSON.stringify({ rolloutState: 'GA' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ slug: 'pulse', rolloutState: 'GA' });
    expect(governance.updateModuleGovernance).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'super_admin' }),
      'pulse',
      expect.objectContaining({ rolloutState: 'GA' }),
    );
  });

  it('allows granular admins to mutate policy routes before service scope checks', async () => {
    const response = await request('/v1/platform/policies/billing.plan.pro.commercial', {
      method: 'PATCH',
      headers: { 'x-test-role': 'admin' },
      body: JSON.stringify({ enabled: true }),
    });

    expect(response.status).toBe(200);
    expect(governance.updatePolicy).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
      'billing.plan.pro.commercial',
      expect.objectContaining({ enabled: true }),
    );
  });

  it('rejects testers from platform metrics and records forbidden audit', async () => {
    const response = await request('/v1/platform/metrics/usage', {
      headers: { 'x-test-role': 'tester' },
    });

    expect(response.status).toBe(403);
    expect(governance.usageMetrics).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.AUTH_FORBIDDEN,
      actorUserId: 'user-1',
      resourceType: 'RoutePermission',
      metadata: expect.objectContaining({
        jwtRole: 'tester',
        resolvedRole: 'tester',
        source: 'platform',
        required: ['platform:metrics:read'],
      }),
    }));
  });

  it('rejects tenant owners from platform governance routes', async () => {
    const response = await request('/v1/platform/modules', {
      headers: {
        'x-test-role': 'OWNER',
        'x-test-tenant-id': 'tenant_a',
      },
    });

    expect(response.status).toBe(403);
    expect(governance.modules).not.toHaveBeenCalled();
  });
});
