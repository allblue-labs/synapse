import {ClinicFlowStatus} from '@prisma/client';
import {ClinicFlowExtractedData, ClinicFlowLog} from '../../contracts/clinic-flow.contracts';

export {ClinicFlowStatus};

export class ClinicFlowEntry {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly conversationId: string | null,
    public status: ClinicFlowStatus,
    public readonly originalMessage: string,
    public transcription: string | null,
    public readonly mediaUrl: string | null,
    public readonly contactPhone: string,
    public readonly contactName: string | null,
    public extractedData: ClinicFlowExtractedData | null,
    public confidence: number | null,
    public aiSummary: string | null,
    public scheduledAt: Date | null,
    public errorMessage: string | null,
    public retryCount: number,
    public processingLogs: ClinicFlowLog[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  canValidate(): boolean {
    return this.status === ClinicFlowStatus.PENDING_VALIDATION;
  }

  canConfirm(): boolean {
    return this.status === ClinicFlowStatus.READY_TO_CONFIRM;
  }

  canRetry(): boolean {
    return this.status === ClinicFlowStatus.FAILED && this.retryCount < 3;
  }

  addLog(stage: string, message: string): void {
    this.processingLogs = [
      ...this.processingLogs,
      {at: new Date().toISOString(), stage, message},
    ];
  }
}
