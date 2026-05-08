import { Prisma } from '@prisma/client';

const SENSITIVE_KEY = /secret|token|password|credential|apiKey|authorization/i;

export function pulseEventPayload(
  action: string,
  data: Record<string, unknown> = {},
): Prisma.InputJsonValue {
  return {
    schemaVersion: 1,
    action,
    data: maskValue(data),
  } as Prisma.InputJsonValue;
}

function maskValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(maskValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : maskValue(entry),
    ]),
  );
}
