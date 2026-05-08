import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  PulseChannelProvider,
  PulseChannelStatus,
  PulseConversationState,
  PulseOperationalStatus,
  PulseTicketStatus,
  PulseTicketType,
} from '@prisma/client';
import {
  PULSE_EVENT_TYPE_VALUES,
  PULSE_TIMELINE_CATEGORY_VALUES,
  PulseTimelineCategory,
} from '../../domain/pulse-event-types';

export class PulseListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class PulseChannelListDto extends PulseListDto {
  @IsOptional()
  @IsIn([PulseChannelProvider.WHATSAPP, PulseChannelProvider.TELEGRAM])
  provider?: PulseChannelProvider;

  @IsOptional()
  @IsIn([
    PulseChannelStatus.ACTIVE,
    PulseChannelStatus.DISCONNECTED,
    PulseChannelStatus.NEEDS_ATTENTION,
    PulseChannelStatus.DISABLED,
  ])
  status?: PulseChannelStatus;
}

export class PulseConversationListDto extends PulseListDto {
  @IsOptional()
  @IsIn([
    PulseConversationState.NEW,
    PulseConversationState.IN_FLOW,
    PulseConversationState.WAITING_CUSTOMER,
    PulseConversationState.WAITING_OPERATOR,
    PulseConversationState.RESOLVED,
    PulseConversationState.CANCELLED,
  ])
  state?: PulseConversationState;

  @IsOptional()
  @IsIn([
    PulseOperationalStatus.ACTIVE,
    PulseOperationalStatus.NEEDS_REVIEW,
    PulseOperationalStatus.ESCALATED,
    PulseOperationalStatus.CLOSED,
  ])
  operationalStatus?: PulseOperationalStatus;
}

export class PulseTicketListDto extends PulseListDto {
  @IsOptional()
  @IsIn([
    PulseTicketType.SUPPORT,
    PulseTicketType.SALES,
    PulseTicketType.SCHEDULING,
    PulseTicketType.MARKETING,
    PulseTicketType.OPERATOR_REVIEW,
    PulseTicketType.KNOWLEDGE_REQUEST,
  ])
  type?: PulseTicketType;

  @IsOptional()
  @IsIn([
    PulseTicketStatus.OPEN,
    PulseTicketStatus.PENDING_REVIEW,
    PulseTicketStatus.WAITING_CUSTOMER,
    PulseTicketStatus.RESOLVED,
    PulseTicketStatus.CANCELLED,
  ])
  status?: PulseTicketStatus;
}

export class PulseEventListDto extends PulseListDto {
  @IsOptional()
  @IsIn(PULSE_EVENT_TYPE_VALUES)
  eventType?: string;

  @IsOptional()
  @IsDateString()
  occurredFrom?: string;

  @IsOptional()
  @IsDateString()
  occurredTo?: string;
}

export class PulseTimelineListDto extends PulseEventListDto {
  @IsOptional()
  @IsIn(PULSE_TIMELINE_CATEGORY_VALUES)
  category?: PulseTimelineCategory;
}
