import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/authorization';
import { PulseController } from './pulse.controller';

describe('PulseController route protection metadata', () => {
  const reflector = new Reflector();

  it('uses the Pulse route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PulseController)).toBe('pulse');
  });

  it.each([
    ['list', ['pulse:read']],
    ['get', ['pulse:read']],
    ['create', ['pulse:write']],
    ['validate', ['pulse:validate']],
    ['reject', ['pulse:reject']],
    ['retry', ['pulse:retry']],
    ['errors', ['pulse:read']],
  ] as const)('%s declares required permissions', (methodName, expected) => {
    const handler = PulseController.prototype[methodName];

    expect(
      reflector.getAllAndOverride(PERMISSIONS_KEY, [handler, PulseController]),
    ).toEqual(expected);
  });
});
