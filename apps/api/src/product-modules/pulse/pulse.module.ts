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
import {CreateEntryUseCase} from './application/use-cases/create-entry.use-case';
import {ValidateEntryUseCase} from './application/use-cases/validate-entry.use-case';
import {RejectEntryUseCase} from './application/use-cases/reject-entry.use-case';
import {RetryEntryUseCase} from './application/use-cases/retry-entry.use-case';
import {PulseRepository} from './infrastructure/repositories/pulse.repository';
import {AiExtractorAdapter} from './infrastructure/adapters/ai-extractor.adapter';
import {AudioTranscriberAdapter} from './infrastructure/adapters/audio-transcriber.adapter';
import {
  PulseProcessor,
  PULSE_QUEUE,
} from './infrastructure/processors/pulse.processor';
import {PULSE_REPOSITORY} from './domain/ports/pulse-repository.port';
import {AI_EXTRACTOR} from './domain/ports/ai-extractor.port';
import {AUDIO_TRANSCRIBER} from './domain/ports/audio-transcriber.port';

const USE_CASES = [
  ListQueueUseCase,
  GetEntryUseCase,
  CreateEntryUseCase,
  ValidateEntryUseCase,
  RejectEntryUseCase,
  RetryEntryUseCase,
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
    {provide: AI_EXTRACTOR, useClass: AiExtractorAdapter},
    {provide: AUDIO_TRANSCRIBER, useClass: AudioTranscriberAdapter},
  ],
  exports: [CreateEntryUseCase],
})
export class PulseModule {}
