import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../authorization/public.decorator';
import { TenantGuard } from './tenant.guard';

function createContext(input: {
  isPublic?: boolean;
  tenantId?: string;
  requestedTenantId?: string;
}): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({
        user: input.tenantId ? { tenantId: input.tenantId } : undefined,
        headers: input.requestedTenantId ? { 'x-tenant-id': input.requestedTenantId } : {},
      })),
    })),
  } as unknown as ExecutionContext;
}

function createGuard(isPublic = false) {
  const reflector = {
    getAllAndOverride: jest.fn((key) => (key === IS_PUBLIC_KEY ? isPublic : undefined)),
  } as unknown as Reflector;
  return new TenantGuard(reflector);
}

describe('TenantGuard', () => {
  it('allows public routes without tenant context', () => {
    const guard = createGuard(true);

    expect(guard.canActivate(createContext({ isPublic: true }))).toBe(true);
  });

  it('sets request tenantId from the authenticated user', () => {
    const request = {
      user: { tenantId: 'tenant_a' },
      headers: {},
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => request),
      })),
    } as unknown as ExecutionContext;
    const guard = createGuard();

    expect(guard.canActivate(context)).toBe(true);
    expect(request).toMatchObject({ tenantId: 'tenant_a' });
  });

  it('rejects authenticated requests without tenant context', () => {
    const guard = createGuard();

    expect(() => guard.canActivate(createContext({}))).toThrow(UnauthorizedException);
  });

  it('rejects x-tenant-id mismatches', () => {
    const guard = createGuard();

    expect(() =>
      guard.canActivate(
        createContext({ tenantId: 'tenant_a', requestedTenantId: 'tenant_b' }),
      ),
    ).toThrow(UnauthorizedException);
  });
});
