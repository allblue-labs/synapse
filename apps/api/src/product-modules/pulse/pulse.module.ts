import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bullmq';
import {ChannelsModule} from '../../modules/channels/channels.module';
import {ConversationsModule} from '../../modules/conversations/conversations.module';
import {MessagesModule} from '../../modules/messages/messages.module';
import {QueueModule} from '../../modules/queue/queue.module';
import {UsageModule} from '../../modules/usage/usage.module';
import {PulseController} from './pulse.controller';
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
import {PulseRepository} from './infrastructure/repositories/pulse.repository';
import {PulseOperationalEventRepository} from './infrastructure/repositories/pulse-operational-event.repository';
import {PulseTicketRepository} from './infrastructure/repositories/pulse-ticket.repository';
import {PulseChannelRepository} from './infrastructure/repositories/pulse-channel.repository';
import {PulseConversationRepository} from './infrastructure/repositories/pulse-conversation.repository';
import {PulseKnowledgeContextRepository} from './infrastructure/repositories/pulse-knowledge-context.repository';
import {PulseIntegrationSettingRepository} from './infrastructure/repositories/pulse-integration-setting.repository';
import {AiExtractorAdapter} from './infrastructure/adapters/ai-extractor.adapter';
import {AudioTranscriberAdapter} from './infrastructure/adapters/audio-transcriber.adapter';
import {
  PulseProcessor,
  PULSE_QUEUE,
} from './infrastructure/processors/pulse.processor';
import {PULSE_REPOSITORY} from './domain/ports/pulse-repository.port';
import {PULSE_OPERATIONAL_EVENT_REPOSITORY} from './domain/ports/pulse-operational-event-repository.port';
import {PULSE_TICKET_REPOSITORY} from './domain/ports/pulse-ticket-repository.port';
import {PULSE_CHANNEL_REPOSITORY} from './domain/ports/pulse-channel-repository.port';
import {PULSE_CONVERSATION_REPOSITORY} from './domain/ports/pulse-conversation-repository.port';
import {PULSE_KNOWLEDGE_CONTEXT_REPOSITORY} from './domain/ports/pulse-knowledge-context-repository.port';
import {PULSE_INTEGRATION_SETTING_REPOSITORY} from './domain/ports/pulse-integration-setting-repository.port';
import {AI_EXTRACTOR} from './domain/ports/ai-extractor.port';
import {AUDIO_TRANSCRIBER} from './domain/ports/audio-transcriber.port';

const USE_CASES = [
  ListQueueUseCase,
  GetEntryUseCase,
  ListChannelsUseCase,
  GetChannelUseCase,
  ListConversationsUseCase,
  GetConversationUseCase,
  ListTicketsUseCase,
  GetTicketUseCase,
  ListConversationEventsUseCase,
  ListTicketEventsUseCase,
  ListOperationalTimelineUseCase,
  CreateEntryUseCase,
  ValidateEntryUseCase,
  RejectEntryUseCase,
  RetryEntryUseCase,
  TicketLifecycleUseCase,
  PulseKnowledgeContextUseCase,
  PulseSchedulingIntegrationUseCase,
];

@Module({
  imports: [
    ChannelsModule,
    ConversationsModule,
    MessagesModule,
    QueueModule,
    UsageModule,
    BullModule.registerQueue({name: PULSE_QUEUE}),
  ],
  controllers: [PulseController],
  providers: [
    ...USE_CASES,
    PulseProcessor,
    {provide: PULSE_REPOSITORY, useClass: PulseRepository},
    {provide: PULSE_OPERATIONAL_EVENT_REPOSITORY, useClass: PulseOperationalEventRepository},
    {provide: PULSE_TICKET_REPOSITORY, useClass: PulseTicketRepository},
    {provide: PULSE_CHANNEL_REPOSITORY, useClass: PulseChannelRepository},
    {provide: PULSE_CONVERSATION_REPOSITORY, useClass: PulseConversationRepository},
    {provide: PULSE_KNOWLEDGE_CONTEXT_REPOSITORY, useClass: PulseKnowledgeContextRepository},
    {provide: PULSE_INTEGRATION_SETTING_REPOSITORY, useClass: PulseIntegrationSettingRepository},
    {provide: AI_EXTRACTOR, useClass: AiExtractorAdapter},
    {provide: AUDIO_TRANSCRIBER, useClass: AudioTranscriberAdapter},
  ],
  exports: [CreateEntryUseCase],
})
export class PulseModule {}
