import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../../common/authorization';
import { BillingController } from './billing.controller';

describe('BillingController route protection metadata', () => {
  const reflector = new Reflector();

  it('uses the billing route prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, BillingController)).toBe('billing');
  });

  it.each([
    ['account', ['billing:read']],
    ['plans', ['billing:read']],
    ['createSubscriptionCheckout', ['billing:manage']],
    ['setFeatureFlag', ['billing:manage']],
  ] as const)('%s declares required permissions', (methodName, expected) => {
    const handler = BillingController.prototype[methodName];

    expect(
      reflector.getAllAndOverride(PERMISSIONS_KEY, [handler, BillingController]),
    ).toEqual(expected);
  });

  it('exposes the Stripe webhook without session or tenant guards', () => {
    const handler = BillingController.prototype.stripeWebhook;

    expect(
      reflector.getAllAndOverride(IS_PUBLIC_KEY, [handler, BillingController]),
    ).toBe(true);
  });
});
