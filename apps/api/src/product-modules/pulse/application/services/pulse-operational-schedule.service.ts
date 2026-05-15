import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { withPulseTenantContext } from '../../infrastructure/repositories/pulse-tenant-context';

export type PulseScheduleDecision = {
  open: boolean;
  reason?: string;
  nextOpeningAt?: Date;
  closedMessage?: string;
};

type BusinessHours = Record<string, Array<{ start?: string; end?: string }>>;

@Injectable()
export class PulseOperationalScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async decide(tenantId: string, now = new Date()): Promise<PulseScheduleDecision> {
    const schedule = await withPulseTenantContext(this.prisma, tenantId, (tx) => tx.pulseOperationalSchedule.findUnique({
      where: { tenantId },
    }));
    if (!schedule) {
      return { open: true };
    }

    if (schedule.operationalPause) {
      return {
        open: false,
        reason: schedule.pauseReason ?? 'operational_pause',
        nextOpeningAt: schedule.nextOpeningAt ?? undefined,
        closedMessage: schedule.closedMessage ?? undefined,
      };
    }

    if (schedule.nextOpeningAt && schedule.nextOpeningAt > now) {
      return {
        open: false,
        reason: 'temporary_closure',
        nextOpeningAt: schedule.nextOpeningAt,
        closedMessage: schedule.closedMessage ?? undefined,
      };
    }

    const hours = this.businessHours(schedule.businessHours);
    if (Object.keys(hours).length === 0) {
      return { open: true };
    }

    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: schedule.timezone,
    }).format(now).toLowerCase();
    const windows = hours[weekday] ?? [];
    const minutes = this.localMinutes(now, schedule.timezone);
    const open = windows.some((window) => {
      const start = this.minutesFromClock(window.start);
      const end = this.minutesFromClock(window.end);
      return start !== null && end !== null && minutes >= start && minutes < end;
    });

    return {
      open,
      reason: open ? undefined : 'outside_business_hours',
      nextOpeningAt: open ? undefined : schedule.nextOpeningAt ?? undefined,
      closedMessage: open ? undefined : schedule.closedMessage ?? undefined,
    };
  }

  private businessHours(value: unknown): BusinessHours {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as BusinessHours;
  }

  private localMinutes(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
  }

  private minutesFromClock(value?: string) {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) {
      return null;
    }
    const [hour, minute] = value.split(':').map(Number);
    if (hour > 23 || minute > 59) {
      return null;
    }
    return hour * 60 + minute;
  }
}
