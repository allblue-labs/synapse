import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const RuntimeSignatureHeaders = {
  KEY_ID: 'x-synapse-runtime-key-id',
  TIMESTAMP: 'x-synapse-runtime-timestamp',
  SIGNATURE: 'x-synapse-runtime-signature',
} as const;

@Injectable()
export class RuntimeSignatureService {
  constructor(private readonly config: ConfigService) {}

  sign(input: {
    method: string;
    path: string;
    body: string;
    timestamp?: number;
  }) {
    const secret = this.config.get<string>('SYNAPSE_RUNTIME_SHARED_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('Synapse Runtime shared secret is not configured.');
    }
    const keyId = this.config.get<string>('SYNAPSE_RUNTIME_KEY_ID') ?? 'platform';
    const timestamp = String(input.timestamp ?? Math.floor(Date.now() / 1000));
    const canonical = `${input.method.toUpperCase()}\n${input.path}\n${timestamp}\n${input.body}`;
    const signature = createHmac('sha256', secret)
      .update(canonical)
      .digest('hex');

    return {
      [RuntimeSignatureHeaders.KEY_ID]: keyId,
      [RuntimeSignatureHeaders.TIMESTAMP]: timestamp,
      [RuntimeSignatureHeaders.SIGNATURE]: `sha256=${signature}`,
    };
  }

  assertValid(input: {
    method: string;
    path: string;
    body: string;
    headers: Record<string, string | string[] | undefined>;
    now?: number;
  }) {
    const secret = this.config.get<string>('SYNAPSE_RUNTIME_SHARED_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('Synapse Runtime shared secret is not configured.');
    }

    const expectedKeyId = this.config.get<string>('SYNAPSE_RUNTIME_KEY_ID') ?? 'platform';
    const keyId = this.header(input.headers, RuntimeSignatureHeaders.KEY_ID);
    const timestamp = this.header(input.headers, RuntimeSignatureHeaders.TIMESTAMP);
    const signature = this.header(input.headers, RuntimeSignatureHeaders.SIGNATURE);
    if (!keyId || !timestamp || !signature) {
      throw new UnauthorizedException('Runtime signature headers are required.');
    }
    if (keyId !== expectedKeyId) {
      throw new UnauthorizedException('Runtime signature key is not allowed.');
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isInteger(timestampSeconds)) {
      throw new UnauthorizedException('Runtime signature timestamp is invalid.');
    }
    const now = input.now ?? Math.floor(Date.now() / 1000);
    const tolerance = this.config.get<number>('SYNAPSE_RUNTIME_SIGNATURE_TOLERANCE_SECONDS') ?? 300;
    if (Math.abs(now - timestampSeconds) > tolerance) {
      throw new UnauthorizedException('Runtime signature timestamp is outside the allowed window.');
    }

    const canonical = `${input.method.toUpperCase()}\n${input.path}\n${timestamp}\n${input.body}`;
    const expected = `sha256=${createHmac('sha256', secret).update(canonical).digest('hex')}`;
    if (!this.safeEqual(signature, expected)) {
      throw new UnauthorizedException('Runtime signature is invalid.');
    }
  }

  private header(headers: Record<string, string | string[] | undefined>, name: string) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
