import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/authorization';
import { UsageController } from './usage.controller';

describe('UsageController route protection metadata', () => {
  const reflector = new Reflector();

  it('uses the usage route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, UsageController)).toBe('usage');
  });

  it.each([
    ['summary', ['billing:read']],
    ['ratedSummary', ['billing:read']],
    ['rates', ['billing:manage']],
    ['setRate', ['billing:manage']],
    ['stripeMeters', ['billing:manage']],
    ['setStripeMeter', ['billing:manage']],
    ['reportToStripe', ['billing:manage']],
  ] as const)('%s declares required permissions', (methodName, expected) => {
    expect(
      reflector.getAllAndOverride(PERMISSIONS_KEY, [
        UsageController.prototype[methodName],
        UsageController,
      ]),
    ).toEqual(expected);
  });
});
