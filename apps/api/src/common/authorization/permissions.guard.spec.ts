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
