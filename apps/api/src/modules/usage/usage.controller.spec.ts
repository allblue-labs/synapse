import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/authorization';
import { UsageController } from './usage.controller';

describe('UsageController route protection metadata', () => {
  const reflector = new Reflector();

  it('uses the usage route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, UsageController)).toBe('usage');
  });

  it('requires billing read permission for usage summary', () => {
    expect(
      reflector.getAllAndOverride(PERMISSIONS_KEY, [
        UsageController.prototype.summary,
        UsageController,
      ]),
    ).toEqual(['billing:read']);
  });
});
