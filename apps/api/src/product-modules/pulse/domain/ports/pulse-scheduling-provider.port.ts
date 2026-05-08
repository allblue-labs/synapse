import { IntegrationProvider } from '@prisma/client';

export type PulseSchedulingProvider = Extract<
  IntegrationProvider,
  'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR' | 'CALENDLY'
>;

export interface PulseSchedulingAvailabilityRequest {
  tenantId: string;
  integrationId: string;
  windowStart: Date;
  windowEnd: Date;
  durationMinutes: number;
  timezone: string;
  metadata?: Record<string, unknown>;
}

export interface PulseSchedulingAvailabilitySlot {
  startsAt: Date;
  endsAt: Date;
  providerRef?: string;
}

export interface PulseSchedulingBookingRequest extends PulseSchedulingAvailabilityRequest {
  slotStartsAt: Date;
  participant: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface PulseSchedulingBookingResponse {
  bookingId: string;
  provider: PulseSchedulingProvider;
  providerRef?: string;
  startsAt: Date;
  endsAt: Date;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
}

export interface PulseSchedulingProviderPort {
  provider: PulseSchedulingProvider;
  findAvailability(input: PulseSchedulingAvailabilityRequest): Promise<PulseSchedulingAvailabilitySlot[]>;
  book(input: PulseSchedulingBookingRequest): Promise<PulseSchedulingBookingResponse>;
}
