import { Inject, Injectable } from '@nestjs/common';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';

@Injectable()
export class ListConversationEventsUseCase {
  constructor(
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
  ) {}

  execute(
    tenantId: string,
    conversationId: string,
    filter?: {
      page?: number;
      pageSize?: number;
      eventType?: string;
      occurredFrom?: string;
      occurredTo?: string;
    },
  ) {
    return this.events.listForConversation(tenantId, conversationId, {
      page: filter?.page,
      pageSize: filter?.pageSize,
      eventType: filter?.eventType,
      occurredFrom: filter?.occurredFrom ? new Date(filter.occurredFrom) : undefined,
      occurredTo: filter?.occurredTo ? new Date(filter.occurredTo) : undefined,
    });
  }
}
