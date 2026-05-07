import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';

function createContext(user?: { role?: string }): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({ user })),
    })),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows public routes without checking permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => key === IS_PUBLIC_KEY),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows authenticated routes without permission metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return undefined;
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(createContext({ role: 'VIEWER' }))).toBe(true);
  });

  it('allows operators to execute Pulse operational actions', () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['pulse:write', 'pulse:validate', 'pulse:retry'];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(createContext({ role: 'OPERATOR' }))).toBe(true);
  });

  it('rejects viewers from mutating Pulse entries', () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['pulse:write'];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() => guard.canActivate(createContext({ role: 'VIEWER' }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects permissioned routes without an authenticated role', () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['pulse:read'];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });
});
