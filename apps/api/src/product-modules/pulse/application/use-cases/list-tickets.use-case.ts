import { Inject, Injectable } from '@nestjs/common';
import { PulseTicketStatus, PulseTicketType } from '@prisma/client';
import {
  IPulseTicketRepository,
  PULSE_TICKET_REPOSITORY,
} from '../../domain/ports/pulse-ticket-repository.port';

@Injectable()
export class ListTicketsUseCase {
  constructor(
    @Inject(PULSE_TICKET_REPOSITORY)
    private readonly tickets: IPulseTicketRepository,
  ) {}

  execute(tenantId: string, filter?: {
    page?: number;
    pageSize?: number;
    type?: PulseTicketType;
    status?: PulseTicketStatus;
  }) {
    return this.tickets.list(tenantId, filter);
  }
}
