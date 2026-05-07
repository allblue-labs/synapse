import {TranscriptionResult} from '../../contracts/pulse.contracts';

export const AUDIO_TRANSCRIBER = Symbol('AUDIO_TRANSCRIBER');

export interface IAudioTranscriber {
  transcribe(audioUrl: string): Promise<TranscriptionResult>;
}
