import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IntegrationProvider, IntegrationStatus } from '@prisma/client';
import { PulseSchedulingIntegrationUseCase } from './pulse-scheduling-integration.use-case';

const integration = {
  id: 'integration-1',
  tenantId: 'tenant-a',
  provider: IntegrationProvider.GOOGLE_CALENDAR,
  status: IntegrationStatus.ACTIVE,
  displayName: 'Primary calendar',
  externalRef: 'calendar-1',
  settings: {},
  metadata: {},
  credentialsConfigured: true,
  createdAt: new Date('2026-05-08T10:00:00.000Z'),
  updatedAt: new Date('2026-05-08T10:00:00.000Z'),
};

describe('PulseSchedulingIntegrationUseCase', () => {
  const integrations = {
    list: jest.fn(),
    findById: jest.fn(),
  };
  const usage = { record: jest.fn() };
  const useCase = new PulseSchedulingIntegrationUseCase(
    integrations as never,
    usage as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    integrations.findById.mockResolvedValue(integration);
  });

  it('prepares availability contracts without provider calls', async () => {
    const result = await useCase.prepareAvailability('tenant-a', {
      provider: IntegrationProvider.GOOGLE_CALENDAR,
      integrationId: 'integration-1',
      windowStart: '2026-05-08T10:00:00.000Z',
      windowEnd: '2026-05-08T12:00:00.000Z',
      durationMinutes: 30,
      timezone: 'America/Recife',
    });

    expect(integrations.findById).toHaveBeenCalledWith('tenant-a', 'integration-1');
    expect(result).toEqual(
      expect.objectContaining({
        prepared: true,
        executable: false,
        reason: 'provider_call_not_implemented',
        provider: IntegrationProvider.GOOGLE_CALENDAR,
      }),
    );
    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        moduleSlug: 'pulse',
        metricType: 'AUTOMATION_EXECUTION',
        unit: 'scheduling_availability_prepare',
        resourceType: 'IntegrationSetting',
        resourceId: 'integration-1',
      }),
    );
  });

  it('rejects provider mismatches', async () => {
    await expect(
      useCase.prepareAvailability('tenant-a', {
        provider: IntegrationProvider.CALENDLY,
        integrationId: 'integration-1',
        windowStart: '2026-05-08T10:00:00.000Z',
        windowEnd: '2026-05-08T12:00:00.000Z',
        durationMinutes: 30,
        timezone: 'America/Recife',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usage.record).not.toHaveBeenCalled();
  });

  it('rejects integrations that are not ready', async () => {
    integrations.findById.mockResolvedValue({
      ...integration,
      credentialsConfigured: false,
    });

    await expect(
      useCase.prepareBooking('tenant-a', {
        provider: IntegrationProvider.GOOGLE_CALENDAR,
        integrationId: 'integration-1',
        windowStart: '2026-05-08T10:00:00.000Z',
        windowEnd: '2026-05-08T12:00:00.000Z',
        durationMinutes: 30,
        timezone: 'America/Recife',
        slotStartsAt: '2026-05-08T10:30:00.000Z',
        participant: { email: 'person@example.com' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws not found for cross-tenant integration ids', async () => {
    integrations.findById.mockResolvedValue(null);

    await expect(
      useCase.get('tenant-a', 'integration-b'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
