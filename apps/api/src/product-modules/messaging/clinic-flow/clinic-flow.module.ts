import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bullmq';
import {ClinicFlowController} from './clinic-flow.controller';
import {ListQueueUseCase} from './application/use-cases/list-queue.use-case';
import {GetEntryUseCase} from './application/use-cases/get-entry.use-case';
import {CreateEntryUseCase} from './application/use-cases/create-entry.use-case';
import {ValidateEntryUseCase} from './application/use-cases/validate-entry.use-case';
import {RejectEntryUseCase} from './application/use-cases/reject-entry.use-case';
import {RetryEntryUseCase} from './application/use-cases/retry-entry.use-case';
import {ClinicFlowRepository} from './infrastructure/repositories/clinic-flow.repository';
import {AiExtractorAdapter} from './infrastructure/adapters/ai-extractor.adapter';
import {AudioTranscriberAdapter} from './infrastructure/adapters/audio-transcriber.adapter';
import {
  ClinicFlowProcessor,
  CLINIC_FLOW_QUEUE,
} from './infrastructure/processors/clinic-flow.processor';
import {CLINIC_FLOW_REPOSITORY} from './domain/ports/clinic-flow-repository.port';
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
    BullModule.registerQueue({name: CLINIC_FLOW_QUEUE}),
  ],
  controllers: [ClinicFlowController],
  providers: [
    ...USE_CASES,
    ClinicFlowProcessor,
    {provide: CLINIC_FLOW_REPOSITORY, useClass: ClinicFlowRepository},
    {provide: AI_EXTRACTOR, useClass: AiExtractorAdapter},
    {provide: AUDIO_TRANSCRIBER, useClass: AudioTranscriberAdapter},
  ],
  exports: [CreateEntryUseCase],
})
export class ClinicFlowModule {}
