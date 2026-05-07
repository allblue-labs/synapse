import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {Permissions} from '../../common/authorization';
import {TenantId} from '../../common/decorators/tenant-id.decorator';
import {ListQueueDto} from './application/dtos/list-queue.dto';
import {
  PulseChannelListDto,
  PulseConversationListDto,
  PulseEventListDto,
  PulseTicketListDto,
} from './application/dtos/pulse-list.dto';
import {CreateEntryDto} from './application/dtos/create-entry.dto';
import {ValidateEntryDto} from './application/dtos/validate-entry.dto';
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
import {CreateEntryUseCase} from './application/use-cases/create-entry.use-case';
import {ValidateEntryUseCase} from './application/use-cases/validate-entry.use-case';
import {RejectEntryUseCase} from './application/use-cases/reject-entry.use-case';
import {RetryEntryUseCase} from './application/use-cases/retry-entry.use-case';

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
    private readonly createEntry: CreateEntryUseCase,
    private readonly validateEntry: ValidateEntryUseCase,
    private readonly rejectEntry: RejectEntryUseCase,
    private readonly retryEntry: RetryEntryUseCase,
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
