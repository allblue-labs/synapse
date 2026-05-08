import { createHmac } from 'crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
}
