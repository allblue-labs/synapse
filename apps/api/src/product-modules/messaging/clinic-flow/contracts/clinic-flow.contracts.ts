export interface ClinicFlowExtractedData {
  procedure?: string;
  date?: string;
  time?: string;
  patientName?: string;
  notes?: string;
}

export interface ClinicFlowLog {
  at: string;
  stage: string;
  message: string;
}

export interface ProcessClinicFlowJob {
  tenantId: string;
  entryId: string;
}

export interface AiExtractionResult {
  extractedData: ClinicFlowExtractedData;
  confidence: number;
  summary: string;
}

export interface TranscriptionResult {
  text: string;
  durationSeconds?: number;
}
