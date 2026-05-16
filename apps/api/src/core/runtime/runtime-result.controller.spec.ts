import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/authorization';
import { RuntimeResultController } from './runtime-result.controller';

describe('RuntimeResultController', () => {
  const signatures = {
    assertValid: jest.fn(),
  };
  const ingress = {
    ingest: jest.fn(),
  };

  const dto = {
    tenantId: 'tenant-1',
    executionRequestId: 'exec-1',
    status: 'SUCCEEDED' as const,
    output: {
      decisionSummary: 'Advance flow.',
      confidence: 0.9,
      nextState: 'collect_context',
      recommendedActions: ['ticket.advance_flow'],
    },
    traceId: 'trace-1',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    ingress.ingest.mockResolvedValue({ ok: true });
  });

  it('is public so runtime callbacks can use HMAC instead of JWT', () => {
    const reflector = new Reflector();
    expect(
      reflector.getAllAndOverride(IS_PUBLIC_KEY, [
        RuntimeResultController.prototype.ingest,
        RuntimeResultController,
      ]),
    ).toBe(true);
  });

  it('verifies the raw body signature before routing runtime results', async () => {
    const controller = new RuntimeResultController(signatures as never, ingress as never);
    const rawBody = Buffer.from(JSON.stringify(dto));

    await expect(controller.ingest(
      {
        method: 'POST',
        originalUrl: '/v1/runtime/results',
        rawBody,
      } as never,
      {
        'x-synapse-runtime-key-id': 'platform',
        'x-synapse-runtime-timestamp': '1778241600',
        'x-synapse-runtime-signature': 'sha256=test',
      },
      dto,
    )).resolves.toEqual({ ok: true });

    expect(signatures.assertValid).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/runtime/results',
      body: rawBody.toString('utf8'),
      headers: {
        'x-synapse-runtime-key-id': 'platform',
        'x-synapse-runtime-timestamp': '1778241600',
        'x-synapse-runtime-signature': 'sha256=test',
      },
    });
    expect(ingress.ingest).toHaveBeenCalledWith({
      dto,
      rawBody: rawBody.toString('utf8'),
      signatureKeyId: 'platform',
      signatureTimestamp: '1778241600',
      signature: 'sha256=test',
    });
  });

  it('fails closed when raw body is unavailable', () => {
    const controller = new RuntimeResultController(signatures as never, ingress as never);

    expect(() => controller.ingest(
      {
        method: 'POST',
        originalUrl: '/v1/runtime/results',
      } as never,
      {},
      dto,
    )).toThrow(BadRequestException);
    expect(signatures.assertValid).not.toHaveBeenCalled();
    expect(ingress.ingest).not.toHaveBeenCalled();
  });
});
