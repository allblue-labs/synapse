import {Inject, Logger} from '@nestjs/common';
import {Processor, WorkerHost} from '@nestjs/bullmq';
import {Job} from 'bullmq';
import {ClinicFlowStatus} from '@prisma/client';
import {
  CLINIC_FLOW_REPOSITORY,
  IClinicFlowRepository,
} from '../../domain/ports/clinic-flow-repository.port';
import {AI_EXTRACTOR, IAiExtractor} from '../../domain/ports/ai-extractor.port';
import {AUDIO_TRANSCRIBER, IAudioTranscriber} from '../../domain/ports/audio-transcriber.port';
import {ConfidenceScore} from '../../domain/value-objects/confidence-score.vo';
import {ProcessClinicFlowJob} from '../../contracts/clinic-flow.contracts';

export const CLINIC_FLOW_QUEUE = 'clinic-flow-processing';

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {type: 'exponential' as const, delay: 3_000},
  removeOnComplete: {age: 60 * 60 * 24, count: 500},
  removeOnFail: false,
};

@Processor(CLINIC_FLOW_QUEUE)
export class ClinicFlowProcessor extends WorkerHost {
  private readonly logger = new Logger(ClinicFlowProcessor.name);

  constructor(
    @Inject(CLINIC_FLOW_REPOSITORY)
    private readonly repository: IClinicFlowRepository,
    @Inject(AI_EXTRACTOR)
    private readonly extractor: IAiExtractor,
    @Inject(AUDIO_TRANSCRIBER)
    private readonly transcriber: IAudioTranscriber,
  ) {
    super();
  }

  async process(job: Job<ProcessClinicFlowJob>): Promise<void> {
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

      log(
        'extract',
        `Extraction complete — confidence ${Math.round(result.confidence * 100)}%`,
      );

      const score = ConfidenceScore.of(result.confidence);

      // Step 3: Determine outcome
      if (score.isTooLow()) {
        log('outcome', 'Confidence below minimum threshold — marking as failed');
        await this.repository.update(tenantId, entryId, {
          status: ClinicFlowStatus.FAILED,
          confidence: result.confidence,
          aiSummary: result.summary,
          extractedData: result.extractedData as Record<string, unknown>,
          errorMessage: `AI confidence too low (${Math.round(result.confidence * 100)}%) — unable to reliably extract scheduling data.`,
          processingLogs: logs,
        });
        return;
      }

      log('outcome', 'Entry ready for operator validation');
      await this.repository.update(tenantId, entryId, {
        status: ClinicFlowStatus.PENDING_VALIDATION,
        confidence: result.confidence,
        aiSummary: result.summary,
        extractedData: result.extractedData as Record<string, unknown>,
        errorMessage: null,
        processingLogs: logs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Processing failed for entry ${entryId}: ${message}`);
      log('error', `Processing failed: ${message}`);

      await this.repository.update(tenantId, entryId, {
        status: ClinicFlowStatus.FAILED,
        errorMessage: message,
        processingLogs: logs,
      });

      throw err;
    }
  }
}
