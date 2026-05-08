import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ExecutionStatus } from '@prisma/client';
import { PERMISSIONS_KEY } from '../../common/authorization';
import { RuntimeExecutionController } from './runtime-execution.controller';

describe('RuntimeExecutionController', () => {
  const reflector = new Reflector();

  it('uses the runtime execution route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, RuntimeExecutionController)).toBe('runtime/executions');
  });

  it.each([
    ['request', ['runtime:executions:create']],
    ['get', ['runtime:executions:read']],
    ['transition', ['runtime:executions:transition']],
    ['cancel', ['runtime:executions:cancel']],
  ] as const)('%s declares required permissions', (methodName, expected) => {
    const handler = RuntimeExecutionController.prototype[methodName];

    expect(
      reflector.getAllAndOverride(PERMISSIONS_KEY, [handler, RuntimeExecutionController]),
    ).toEqual(expected);
  });

  it('adds server tenant and actor context to execution requests', () => {
    const lifecycle = { request: jest.fn() };
    const controller = new RuntimeExecutionController(lifecycle as never);

    controller.request(
      'tenant-a',
      { sub: 'user-1', tenantId: 'tenant-a', role: 'OPERATOR', email: 'user@example.com' },
      {
        moduleSlug: 'pulse',
        requestType: 'pulse.flow.advance',
        idempotencyKey: 'idem-1',
        input: { ticketId: 'ticket-1' },
      },
    );

    expect(lifecycle.request).toHaveBeenCalledWith({
      context: {
        tenantId: 'tenant-a',
        moduleSlug: 'pulse',
        actorUserId: 'user-1',
        metadata: undefined,
      },
      requestType: 'pulse.flow.advance',
      idempotencyKey: 'idem-1',
      input: { ticketId: 'ticket-1' },
    });
  });

  it('adds server actor context to execution transitions', () => {
    const lifecycle = { transition: jest.fn() };
    const controller = new RuntimeExecutionController(lifecycle as never);

    controller.transition(
      'tenant-a',
      { sub: 'user-1', tenantId: 'tenant-a', role: 'OWNER', email: 'user@example.com' },
      'exec-1',
      {
        status: ExecutionStatus.RUNNING,
      },
    );

    expect(lifecycle.transition).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      executionId: 'exec-1',
      status: ExecutionStatus.RUNNING,
      actorUserId: 'user-1',
      output: undefined,
      errorMessage: undefined,
    });
  });

  it('exposes cancellation as a dedicated runtime command', () => {
    const lifecycle = { cancel: jest.fn() };
    const controller = new RuntimeExecutionController(lifecycle as never);

    controller.cancel(
      'tenant-a',
      { sub: 'user-1', tenantId: 'tenant-a', role: 'OWNER', email: 'user@example.com' },
      'exec-1',
      { reason: 'operator requested' },
    );

    expect(lifecycle.cancel).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      executionId: 'exec-1',
      actorUserId: 'user-1',
      reason: 'operator requested',
    });
  });
});
