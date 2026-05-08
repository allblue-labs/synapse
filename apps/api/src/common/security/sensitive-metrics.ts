import type { AuthenticatedUser } from '../types/authenticated-user';

const SENSITIVE_METRIC_KEYS = new Set([
  'stripeCustomerId',
  'stripeSubscriptionId',
  'providerAccountId',
  'providerCostRaw',
  'revenueRaw',
  'marginRaw',
  'customerEmail',
  'customerPhone',
  'tenantSecretMetadata',
]);

export function canReadSensitiveAdminMetrics(user: AuthenticatedUser): boolean {
  return user.role === 'super_admin' || user.role === 'platform_admin';
}

export function maskSensitiveMetricFields<T>(value: T, user: AuthenticatedUser): T {
  if (canReadSensitiveAdminMetrics(user)) return value;
  return maskValue(value) as T;
}

function maskValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_METRIC_KEYS.has(key) ? '[redacted]' : maskValue(entry),
    ]),
  );
}
