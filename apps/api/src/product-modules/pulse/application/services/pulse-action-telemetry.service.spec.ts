import { PulseActionTelemetryService } from './pulse-action-telemetry.service';

describe('PulseActionTelemetryService', () => {
  const logger = {
    write: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs action outcomes without raw idempotency keys or payloads', () => {
    const service = new PulseActionTelemetryService(logger as never);

    service.record({
      tenantId: 'tenant-1',
      action: 'ticket.advance_flow',
      idempotencyKey: 'pulse.actions:tenant-1:exec-1:ticket.advance_flow:ticket-1',
      ticketId: 'ticket-1',
      outcome: 'claimed',
      attempts: 1,
    });

    expect(logger.write).toHaveBeenCalledWith(expect.objectContaining({
      level: 'log',
      message: 'pulse_action_observed',
      context: 'PulseActionTelemetry',
      tenantId: 'tenant-1',
      metadata: expect.objectContaining({
        action: 'ticket.advance_flow',
        outcome: 'claimed',
        idempotencyKeyHash: expect.any(String),
        ticketId: 'ticket-1',
        attempts: 1,
      }),
    }));
    expect(logger.write.mock.calls[0][0].metadata.idempotencyKeyHash).toHaveLength(16);
    expect(JSON.stringify(logger.write.mock.calls[0][0])).not.toContain('pulse.actions:tenant-1');
  });

  it('uses warn level for in-progress and failed outcomes', () => {
    const service = new PulseActionTelemetryService(logger as never);

    service.record({
      tenantId: 'tenant-1',
      action: 'ticket.advance_flow',
      outcome: 'in_progress',
    });

    expect(logger.write).toHaveBeenCalledWith(expect.objectContaining({
      level: 'warn',
      metadata: expect.objectContaining({
        outcome: 'in_progress',
      }),
    }));
  });
});
