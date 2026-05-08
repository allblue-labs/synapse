import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';

function createContext(user?: { role?: string; tenantId?: string; sub?: string }): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({ user })),
    })),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const audit = {
    record: jest.fn(),
  };

  beforeEach(() => {
    audit.record.mockReset();
  });

  it('allows public routes without checking permissions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => key === IS_PUBLIC_KEY),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, audit as never);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('allows authenticated routes without permission metadata', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return undefined;
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, audit as never);

    await expect(guard.canActivate(createContext({ role: 'VIEWER' }))).resolves.toBe(true);
  });

  it('allows operators to execute Pulse operational actions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['pulse:write', 'pulse:validate', 'pulse:retry'];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, audit as never);

    await expect(guard.canActivate(createContext({ role: 'OPERATOR' }))).resolves.toBe(true);
  });

  it('allows super admins to satisfy platform-wide permissions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['users:role.assign', 'modules:manage', 'billing:manage'];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, audit as never);

    await expect(
      guard.canActivate(createContext({ role: 'super_admin', sub: 'admin_1' })),
    ).resolves.toBe(true);
  });

  it('allows granular admins to manage customers/testers but not admins', async () => {
    const allowedReflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) {
          return ['platform:users:manage_customers', 'platform:users:manage_testers'];
        }
        return undefined;
      }),
    } as unknown as Reflector;
    const deniedReflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['platform:users:manage_admins'];
        return undefined;
      }),
    } as unknown as Reflector;

    await expect(
      new PermissionsGuard(allowedReflector, audit as never).canActivate(
        createContext({ role: 'admin', sub: 'admin_1' }),
      ),
    ).resolves.toBe(true);
    await expect(
      new PermissionsGuard(deniedReflector, audit as never).canActivate(
        createContext({ role: 'admin', sub: 'admin_1' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects testers from admin metrics permissions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['platform:metrics:read'];
        return undefined;
      }),
    } as unknown as Reflector;

    await expect(
      new PermissionsGuard(reflector, audit as never).canActivate(
        createContext({ role: 'tester', sub: 'tester_1' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects tenant roles from platform user read permissions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['platform:users:read'];
        return undefined;
      }),
    } as unknown as Reflector;

    await expect(
      new PermissionsGuard(reflector, audit as never).canActivate(
        createContext({ role: 'OWNER', tenantId: 'tenant_a', sub: 'owner_1' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects viewers from mutating Pulse entries and records forbidden audit', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['pulse:write'];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, audit as never);

    await expect(
      guard.canActivate(createContext({
        role: 'VIEWER',
        tenantId: 'tenant_a',
        sub: 'user_1',
      })),
    ).rejects.toThrow(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant_a',
      actorUserId: 'user_1',
      action: 'auth.forbidden',
    }));
  });

  it('rejects permissioned routes without an authenticated role', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['pulse:read'];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, audit as never);

    await expect(guard.canActivate(createContext())).rejects.toThrow(ForbiddenException);
  });
});
