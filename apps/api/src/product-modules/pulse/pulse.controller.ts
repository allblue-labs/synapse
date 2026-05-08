import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {Permissions} from '../../common/authorization';
import {CurrentUser} from '../../common/decorators/current-user.decorator';
import {TenantId} from '../../common/decorators/tenant-id.decorator';
import {AuthenticatedUser} from '../../common/types/authenticated-user';
import {ListQueueDto} from './application/dtos/list-queue.dto';
import {
  PulseChannelListDto,
  PulseConversationListDto,
  PulseEventListDto,
  PulseTimelineListDto,
  PulseTicketListDto,
} from './application/dtos/pulse-list.dto';
import {CreateEntryDto} from './application/dtos/create-entry.dto';
import {ValidateEntryDto} from './application/dtos/validate-entry.dto';
import {
  PublishPulseKnowledgeContextDto,
  PulseKnowledgeContextListDto,
  QueryPulseKnowledgeContextDto,
} from './application/dtos/pulse-knowledge-context.dto';
import {
  PrepareSchedulingAvailabilityDto,
  PrepareSchedulingBookingDto,
  PulseSchedulingIntegrationListDto,
} from './application/dtos/pulse-scheduling.dto';
import {
  AdvanceFlowStateDto,
  AssignTicketDto,
  CancelTicketDto,
  EscalateTicketDto,
  ReopenTicketDto,
  ResolveTicketDto,
  SubmitOperatorReviewDto,
} from './application/dtos/ticket-lifecycle.dto';
import {ListQueueUseCase} from './application/use-cases/list-queue.use-case';
import {GetEntryUseCase} from './application/use-cases/get-entry.use-case';
import {ListChannelsUseCase} from './application/use-cases/list-channels.use-case';
import {GetChannelUseCase} from './application/use-cases/get-channel.use-case';
import {ListConversationsUseCase} from './application/use-cases/list-conversations.use-case';
import {GetConversationUseCase} from './application/use-cases/get-conversation.use-case';
import {ListTicketsUseCase} from './application/use-cases/list-tickets.use-case';
import {GetTicketUseCase} from './application/use-cases/get-ticket.use-case';
import {ListConversationEventsUseCase} from './application/use-cases/list-conversation-events.use-case';
import {ListTicketEventsUseCase} from './application/use-cases/list-ticket-events.use-case';
import {ListOperationalTimelineUseCase} from './application/use-cases/list-operational-timeline.use-case';
import {CreateEntryUseCase} from './application/use-cases/create-entry.use-case';
import {ValidateEntryUseCase} from './application/use-cases/validate-entry.use-case';
import {RejectEntryUseCase} from './application/use-cases/reject-entry.use-case';
import {RetryEntryUseCase} from './application/use-cases/retry-entry.use-case';
import {TicketLifecycleUseCase} from './application/use-cases/ticket-lifecycle.use-case';
import {PulseKnowledgeContextUseCase} from './application/use-cases/pulse-knowledge-context.use-case';
import {PulseSchedulingIntegrationUseCase} from './application/use-cases/pulse-scheduling-integration.use-case';

@Controller('pulse')
export class PulseController {
  constructor(
    private readonly listQueue: ListQueueUseCase,
    private readonly getEntry: GetEntryUseCase,
    private readonly listChannels: ListChannelsUseCase,
    private readonly getChannel: GetChannelUseCase,
    private readonly listConversations: ListConversationsUseCase,
    private readonly getConversation: GetConversationUseCase,
    private readonly listTickets: ListTicketsUseCase,
    private readonly getTicket: GetTicketUseCase,
    private readonly listConversationEvents: ListConversationEventsUseCase,
    private readonly listTicketEvents: ListTicketEventsUseCase,
    private readonly listOperationalTimeline: ListOperationalTimelineUseCase,
    private readonly createEntry: CreateEntryUseCase,
    private readonly validateEntry: ValidateEntryUseCase,
    private readonly rejectEntry: RejectEntryUseCase,
    private readonly retryEntry: RetryEntryUseCase,
    private readonly ticketLifecycle: TicketLifecycleUseCase,
    private readonly knowledgeContext: PulseKnowledgeContextUseCase,
    private readonly schedulingIntegrations: PulseSchedulingIntegrationUseCase,
  ) {}

  @Permissions('pulse:read')
  @Get('channels')
  channels(@TenantId() tenantId: string, @Query() query: PulseChannelListDto) {
    return this.listChannels.execute(tenantId, query);
  }

  @Permissions('pulse:read')
  @Get('channels/:id')
  channel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.getChannel.execute(tenantId, id);
  }

  @Permissions('pulse:read')
  @Get('conversations')
  conversations(@TenantId() tenantId: string, @Query() query: PulseConversationListDto) {
    return this.listConversations.execute(tenantId, query);
  }

  @Permissions('pulse:read')
  @Get('conversations/:id')
  conversation(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.getConversation.execute(tenantId, id);
  }

  @Permissions('pulse:read')
  @Get('conversations/:id/events')
  conversationEvents(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: PulseEventListDto,
  ) {
    return this.listConversationEvents.execute(tenantId, id, query);
  }

  @Permissions('pulse:read')
  @Get('conversations/:id/timeline')
  conversationTimeline(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: PulseTimelineListDto,
  ) {
    return this.listOperationalTimeline.execute(tenantId, 'conversation', id, query);
  }

  @Permissions('tickets:read')
  @Get('tickets')
  tickets(@TenantId() tenantId: string, @Query() query: PulseTicketListDto) {
    return this.listTickets.execute(tenantId, query);
  }

  @Permissions('tickets:read')
  @Get('tickets/:id')
  ticket(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.getTicket.execute(tenantId, id);
  }

  @Permissions('tickets:read')
  @Get('tickets/:id/events')
  ticketEvents(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: PulseEventListDto,
  ) {
    return this.listTicketEvents.execute(tenantId, id, query);
  }

  @Permissions('tickets:read')
  @Get('tickets/:id/timeline')
  ticketTimeline(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: PulseTimelineListDto,
  ) {
    return this.listOperationalTimeline.execute(tenantId, 'ticket', id, query);
  }

  @Permissions('tickets:assign')
  @Post('tickets/:id/assign')
  assignTicket(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketLifecycle.assignTicket(tenantId, id, user, dto);
  }

  @Permissions('tickets:resolve')
  @Post('tickets/:id/resolve')
  resolveTicket(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveTicketDto,
  ) {
    return this.ticketLifecycle.resolveTicket(tenantId, id, user, dto);
  }

  @Permissions('tickets:write')
  @Post('tickets/:id/reopen')
  reopenTicket(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReopenTicketDto,
  ) {
    return this.ticketLifecycle.reopenTicket(tenantId, id, user, dto);
  }

  @Permissions('tickets:assign')
  @Post('tickets/:id/escalate')
  escalateTicket(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EscalateTicketDto,
  ) {
    return this.ticketLifecycle.escalateTicket(tenantId, id, user, dto);
  }

  @Permissions('tickets:write')
  @Post('tickets/:id/cancel')
  cancelTicket(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelTicketDto,
  ) {
    return this.ticketLifecycle.cancelTicket(tenantId, id, user, dto);
  }

  @Permissions('tickets:write')
  @Post('tickets/:id/operator-review')
  submitOperatorReview(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitOperatorReviewDto,
  ) {
    return this.ticketLifecycle.submitOperatorReview(tenantId, id, user, dto);
  }

  @Permissions('tickets:write')
  @Post('tickets/:id/flow/advance')
  advanceFlowState(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AdvanceFlowStateDto,
  ) {
    return this.ticketLifecycle.advanceFlowState(tenantId, id, user, dto);
  }

  @Permissions('pulse:read')
  @Get('knowledge')
  knowledge(
    @TenantId() tenantId: string,
    @Query() query: PulseKnowledgeContextListDto,
  ) {
    return this.knowledgeContext.list(tenantId, query);
  }

  @Permissions('pulse:read')
  @Get('knowledge/:id')
  knowledgeContextById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.knowledgeContext.get(tenantId, id);
  }

  @Permissions('pulse:read')
  @Post('knowledge/query')
  queryKnowledge(
    @TenantId() tenantId: string,
    @Body() dto: QueryPulseKnowledgeContextDto,
  ) {
    return this.knowledgeContext.query(tenantId, dto);
  }

  @Permissions('pulse:write')
  @Post('knowledge')
  publishKnowledge(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PublishPulseKnowledgeContextDto,
  ) {
    return this.knowledgeContext.publish(tenantId, user, dto);
  }

  @Permissions('pulse:write')
  @Post('knowledge/:id/archive')
  archiveKnowledge(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.knowledgeContext.archive(tenantId, user, id);
  }

  @Permissions('integrations:read')
  @Get('integrations/scheduling')
  schedulingIntegrationsList(
    @TenantId() tenantId: string,
    @Query() query: PulseSchedulingIntegrationListDto,
  ) {
    return this.schedulingIntegrations.list(tenantId, query);
  }

  @Permissions('integrations:read')
  @Get('integrations/scheduling/:id')
  schedulingIntegration(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.schedulingIntegrations.get(tenantId, id);
  }

  @Permissions('integrations:read')
  @Post('scheduling/availability/prepare')
  prepareSchedulingAvailability(
    @TenantId() tenantId: string,
    @Body() dto: PrepareSchedulingAvailabilityDto,
  ) {
    return this.schedulingIntegrations.prepareAvailability(tenantId, dto);
  }

  @Permissions('integrations:manage')
  @Post('scheduling/bookings/prepare')
  prepareSchedulingBooking(
    @TenantId() tenantId: string,
    @Body() dto: PrepareSchedulingBookingDto,
  ) {
    return this.schedulingIntegrations.prepareBooking(tenantId, dto);
  }

  @Permissions('pulse:read')
  @Get('queue')
  list(@TenantId() tenantId: string, @Query() query: ListQueueDto) {
    return this.listQueue.execute(tenantId, query);
  }

  @Permissions('pulse:read')
  @Get('queue/:id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.getEntry.execute(tenantId, id);
  }

  @Permissions('pulse:write')
  @Post('entries')
  create(@TenantId() tenantId: string, @Body() dto: CreateEntryDto) {
    return this.createEntry.execute({tenantId, ...dto});
  }

  @Permissions('pulse:validate')
  @Post('queue/:id/validate')
  validate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ValidateEntryDto,
  ) {
    return this.validateEntry.execute(tenantId, id, {
      extractedData: dto.extractedData,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Permissions('pulse:reject')
  @Post('queue/:id/reject')
  reject(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.rejectEntry.execute(tenantId, id, reason);
  }

  @Permissions('pulse:retry')
  @Post('queue/:id/retry')
  retry(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.retryEntry.execute(tenantId, id);
  }

  @Permissions('pulse:read')
  @Get('errors')
  errors(@TenantId() tenantId: string) {
    return this.listQueue.execute(tenantId, {status: 'FAILED' as const});
  }
}
