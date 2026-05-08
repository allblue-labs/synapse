import { Inject, Injectable } from '@nestjs/common';
import {
  pulseEventTypesForCategory,
  PulseTimelineCategory,
} from '../../domain/pulse-event-types';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';

export type PulseTimelineScope = 'ticket' | 'conversation';

@Injectable()
export class ListOperationalTimelineUseCase {
  constructor(
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
  ) {}

  async execute(
    tenantId: string,
    scope: PulseTimelineScope,
    resourceId: string,
    filter: {
      page?: number;
      pageSize?: number;
      eventType?: string;
      category?: PulseTimelineCategory;
      occurredFrom?: string;
      occurredTo?: string;
    } = {},
  ) {
    const eventTypes = pulseEventTypesForCategory(filter.category);
    const timelineFilter = {
      page: filter.page,
      pageSize: filter.pageSize,
      eventType: filter.category ? undefined : filter.eventType,
      eventTypes,
      occurredFrom: filter.occurredFrom ? new Date(filter.occurredFrom) : undefined,
      occurredTo: filter.occurredTo ? new Date(filter.occurredTo) : undefined,
    };

    const timeline = scope === 'ticket'
      ? await this.events.listForTicket(tenantId, resourceId, timelineFilter)
      : await this.events.listForConversation(tenantId, resourceId, timelineFilter);

    return {
      scope,
      resourceId,
      category: filter.category ?? null,
      ...timeline,
    };
  }
}
