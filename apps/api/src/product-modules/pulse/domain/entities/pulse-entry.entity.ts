import {PulseStatus} from '@prisma/client';
import {PulseExtractedData, PulseLog} from '../../contracts/pulse.contracts';

export {PulseStatus};

export class PulseEntry {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly conversationId: string | null,
    public status: PulseStatus,
    public readonly originalMessage: string,
    public transcription: string | null,
    public readonly mediaUrl: string | null,
    public readonly contactPhone: string,
    public readonly contactName: string | null,
    public extractedData: PulseExtractedData | null,
    public confidence: number | null,
    public aiSummary: string | null,
    public scheduledAt: Date | null,
    public errorMessage: string | null,
    public retryCount: number,
    public processingLogs: PulseLog[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  canValidate(): boolean {
    return this.status === PulseStatus.PENDING_VALIDATION;
  }

  canConfirm(): boolean {
    return this.status === PulseStatus.READY_TO_CONFIRM;
  }

  canRetry(): boolean {
    return this.status === PulseStatus.FAILED && this.retryCount < 3;
  }

  addLog(stage: string, message: string): void {
    this.processingLogs = [
      ...this.processingLogs,
      {at: new Date().toISOString(), stage, message},
    ];
  }
}
