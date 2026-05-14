import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PulseOperationalScheduleService } from './pulse-operational-schedule.service';

describe('PulseOperationalScheduleService', () => {
  const prisma = {
    pulseOperationalSchedule: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('treats tenants without Pulse schedule as open', async () => {
    prisma.pulseOperationalSchedule.findUnique.mockResolvedValue(null);
    const service = new PulseOperationalScheduleService(prisma as unknown as PrismaService);

    await expect(service.decide('tenant-1')).resolves.toEqual({ open: true });
  });

  it('closes processing during an operational pause', async () => {
    prisma.pulseOperationalSchedule.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      timezone: 'UTC',
      operationalPause: true,
      pauseReason: 'vacation',
      nextOpeningAt: new Date('2026-05-15T09:00:00.000Z'),
      closedMessage: 'We are closed right now.',
      businessHours: {},
    });
    const service = new PulseOperationalScheduleService(prisma as unknown as PrismaService);

    await expect(service.decide('tenant-1', new Date('2026-05-14T12:00:00.000Z')))
      .resolves.toEqual({
        open: false,
        reason: 'vacation',
        nextOpeningAt: new Date('2026-05-15T09:00:00.000Z'),
        closedMessage: 'We are closed right now.',
      });
  });

  it('evaluates business hours in the schedule timezone', async () => {
    prisma.pulseOperationalSchedule.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      timezone: 'UTC',
      operationalPause: false,
      nextOpeningAt: null,
      closedMessage: 'Closed.',
      businessHours: {
        thu: [{ start: '09:00', end: '17:00' }],
      },
    });
    const service = new PulseOperationalScheduleService(prisma as unknown as PrismaService);

    await expect(service.decide('tenant-1', new Date('2026-05-14T20:00:00.000Z')))
      .resolves.toEqual({
        open: false,
        reason: 'outside_business_hours',
        nextOpeningAt: undefined,
        closedMessage: 'Closed.',
      });
  });
});
