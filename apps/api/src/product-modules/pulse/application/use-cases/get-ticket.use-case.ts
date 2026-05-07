import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IPulseTicketRepository,
  PULSE_TICKET_REPOSITORY,
} from '../../domain/ports/pulse-ticket-repository.port';

@Injectable()
export class GetTicketUseCase {
  constructor(
    @Inject(PULSE_TICKET_REPOSITORY)
    private readonly tickets: IPulseTicketRepository,
  ) {}

  async execute(tenantId: string, id: string) {
    const ticket = await this.tickets.findById(tenantId, id);
    if (!ticket) {
      throw new NotFoundException(`Pulse ticket ${id} not found`);
    }
    return ticket;
  }
}
