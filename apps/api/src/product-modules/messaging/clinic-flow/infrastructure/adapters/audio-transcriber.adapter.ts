import {Injectable, ServiceUnavailableException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {IAudioTranscriber} from '../../domain/ports/audio-transcriber.port';
import {TranscriptionResult} from '../../contracts/clinic-flow.contracts';

interface WhisperResponse {
  text: string;
  duration?: number;
}

@Injectable()
export class AudioTranscriberAdapter implements IAudioTranscriber {
  constructor(private readonly config: ConfigService) {}

  async transcribe(audioUrl: string): Promise<TranscriptionResult> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('OpenAI API key is not configured');
    }

    // Download the audio file first
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new ServiceUnavailableException('Failed to download audio file');
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer]);

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {Authorization: `Bearer ${apiKey}`},
      body: formData,
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Audio transcription failed');
    }

    const result = (await response.json()) as WhisperResponse;

    return {
      text: result.text,
      durationSeconds: result.duration,
    };
  }
}
