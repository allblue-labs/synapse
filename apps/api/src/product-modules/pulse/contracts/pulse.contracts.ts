export interface PulseExtractedData {
  procedure?: string;
  date?: string;
  time?: string;
  patientName?: string;
  notes?: string;
}

export interface PulseLog {
  at: string;
  stage: string;
  message: string;
}

export interface ProcessPulseJob {
  tenantId: string;
  entryId: string;
}

export interface AiExtractionResult {
  extractedData: PulseExtractedData;
  confidence: number;
  summary: string;
}

export interface TranscriptionResult {
  text: string;
  durationSeconds?: number;
}
