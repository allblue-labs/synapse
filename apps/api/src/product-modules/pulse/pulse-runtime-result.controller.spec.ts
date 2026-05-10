import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/authorization';
import { PulseRuntimeResultController } from './pulse-runtime-result.controller';

describe('PulseRuntimeResultController', () => {
  const signatures = {
    assertValid: jest.fn(),
  };
  const ingest = {
    execute: jest.fn(),
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
    ingest.execute.mockResolvedValue({ ok: true });
  });

  it('is public so runtime callbacks can use HMAC instead of JWT', () => {
    const reflector = new Reflector();
    expect(
      reflector.getAllAndOverride(IS_PUBLIC_KEY, [
        PulseRuntimeResultController.prototype.ingest,
        PulseRuntimeResultController,
      ]),
    ).toBe(true);
  });

  it('verifies the raw body signature before ingesting runtime results', async () => {
    const controller = new PulseRuntimeResultController(signatures as never, ingest as never);
    const rawBody = Buffer.from(JSON.stringify(dto));

    await expect(controller.ingest(
      {
        method: 'POST',
        originalUrl: '/v1/pulse/runtime/results',
        rawBody,
      } as never,
      { 'x-synapse-runtime-signature': 'sha256=test' },
      dto,
    )).resolves.toEqual({ ok: true });

    expect(signatures.assertValid).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/pulse/runtime/results',
      body: rawBody.toString('utf8'),
      headers: { 'x-synapse-runtime-signature': 'sha256=test' },
    });
    expect(ingest.execute).toHaveBeenCalledWith(dto);
  });

  it('fails closed when raw body is unavailable', () => {
    const controller = new PulseRuntimeResultController(signatures as never, ingest as never);

    expect(() => controller.ingest(
      {
        method: 'POST',
        originalUrl: '/v1/pulse/runtime/results',
      } as never,
      {},
      dto,
    )).toThrow(BadRequestException);
    expect(signatures.assertValid).not.toHaveBeenCalled();
    expect(ingest.execute).not.toHaveBeenCalled();
  });
});
