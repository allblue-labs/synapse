import {Inject, Logger} from '@nestjs/common';
import {Processor, WorkerHost} from '@nestjs/bullmq';
import {Job} from 'bullmq';
import {PulseStatus} from '@prisma/client';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
} from '../../domain/ports/pulse-repository.port';
import {AI_EXTRACTOR, IAiExtractor} from '../../domain/ports/ai-extractor.port';
import {AUDIO_TRANSCRIBER, IAudioTranscriber} from '../../domain/ports/audio-transcriber.port';
import {ConfidenceScore} from '../../domain/value-objects/confidence-score.vo';
import {ProcessPulseJob} from '../../contracts/pulse.contracts';
import {UsageMeteringService, UsageMetricType} from '../../../../modules/usage/usage-metering.service';
import { PULSE_QUEUES } from '../queues/pulse-queue.contracts';
import { PULSE_DEFAULT_JOB_OPTIONS } from '../queues/pulse-queue.service';

export const PULSE_QUEUE = PULSE_QUEUES.INBOUND;
export const DEFAULT_JOB_OPTIONS = PULSE_DEFAULT_JOB_OPTIONS;

@Processor(PULSE_QUEUE)
export class PulseProcessor extends WorkerHost {
  private readonly logger = new Logger(PulseProcessor.name);

  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
    @Inject(AI_EXTRACTOR)
    private readonly extractor: IAiExtractor,
    @Inject(AUDIO_TRANSCRIBER)
    private readonly transcriber: IAudioTranscriber,
    private readonly usage: UsageMeteringService,
  ) {
    super();
  }

  async process(job: Job<ProcessPulseJob>): Promise<void> {
    const {tenantId, entryId} = job.data;

    const entry = await this.repository.findById(tenantId, entryId);
    if (!entry) {
      this.logger.warn(`Entry ${entryId} not found — skipping`);
      return;
    }

    const logs = [...entry.processingLogs];
    const log = (stage: string, message: string) => {
      logs.push({at: new Date().toISOString(), stage, message});
    };

    try {
      let textToExtract = entry.originalMessage;

      // Step 1: Transcribe audio if needed
      if (entry.mediaUrl && !entry.transcription) {
        log('transcribe', 'Starting audio transcription');
        const result = await this.transcriber.transcribe(entry.mediaUrl);
        await this.usage.record({
          tenantId,
          moduleSlug: 'pulse',
          metricType: UsageMetricType.AUDIO_TRANSCRIPTION,
          quantity: result.durationSeconds ?? 0,
          unit: 'second',
          resourceType: 'PulseEntry',
          resourceId: entryId,
          idempotencyKey: `pulse-transcription:${entryId}`,
        });
        textToExtract = result.text;
        log(
          'transcribe',
          `Transcription complete${result.durationSeconds ? ` (${result.durationSeconds.toFixed(1)}s)` : ''}`,
        );
        await this.repository.update(tenantId, entryId, {
          transcription: result.text,
          processingLogs: logs,
        });
      } else if (entry.transcription) {
        textToExtract = entry.transcription;
      }

      if (!textToExtract?.trim()) {
        throw new Error('No text available for extraction');
      }

      // Step 2: AI extraction
      log('extract', 'Starting AI data extraction');
      const today = new Date().toISOString().slice(0, 10);
      const result = await this.extractor.extract(textToExtract, today);
      await this.usage.record({
        tenantId,
        moduleSlug: 'pulse',
        metricType: UsageMetricType.AI_CALL,
        quantity: 1,
        unit: 'call',
        resourceType: 'PulseEntry',
        resourceId: entryId,
        idempotencyKey: `pulse-ai-extract:${entryId}`,
        metadata: { task: 'extraction' },
      });

      log(
        'extract',
        `Extraction complete — confidence ${Math.round(result.confidence * 100)}%`,
      );

      const score = ConfidenceScore.of(result.confidence);

      // Step 3: Determine outcome
      if (score.isTooLow()) {
        log('outcome', 'Confidence below minimum threshold — marking as failed');
        await this.repository.update(tenantId, entryId, {
          status: PulseStatus.FAILED,
          confidence: result.confidence,
          aiSummary: result.summary,
          extractedData: result.extractedData,
          errorMessage: `AI confidence too low (${Math.round(result.confidence * 100)}%) — unable to reliably extract scheduling data.`,
          processingLogs: logs,
        });
        return;
      }

      log('outcome', 'Entry ready for operator validation');
      await this.repository.update(tenantId, entryId, {
        status: PulseStatus.PENDING_VALIDATION,
        confidence: result.confidence,
        aiSummary: result.summary,
        extractedData: result.extractedData,
        errorMessage: null,
        processingLogs: logs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Processing failed for entry ${entryId}: ${message}`);
      log('error', `Processing failed: ${message}`);

      await this.repository.update(tenantId, entryId, {
        status: PulseStatus.FAILED,
        errorMessage: message,
        processingLogs: logs,
      });

      throw err;
    }
  }
}
