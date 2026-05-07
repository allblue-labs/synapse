import {Injectable, ServiceUnavailableException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {IAiExtractor} from '../../domain/ports/ai-extractor.port';
import {AiExtractionResult} from '../../contracts/pulse.contracts';

const EXTRACTION_SYSTEM_PROMPT = `You are a medical scheduling assistant. Extract appointment scheduling information from WhatsApp messages.

Return ONLY a valid JSON object — no markdown, no extra text — with these fields:
- procedure: string | null (medical procedure name, in English)
- date: string | null (ISO date "YYYY-MM-DD", based on today's date for relative references)
- time: string | null (24-hour format "HH:MM")
- patientName: string | null
- notes: string | null (any relevant context not captured above)
- confidence: number (0.0–1.0, your confidence in the overall extraction accuracy)
- summary: string (1–2 sentences: what was found and why confidence is at that level — no chain-of-thought)`;

interface OpenAIChoice {
  message: {content: string};
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
}

@Injectable()
export class AiExtractorAdapter implements IAiExtractor {
  constructor(private readonly config: ConfigService) {}

  async extract(text: string, today: string): Promise<AiExtractionResult> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('OpenAI API key is not configured');
    }

    const model = this.config.get<string>('OPENAI_DEFAULT_MODEL', 'gpt-4o-mini');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: {type: 'json_object'},
        messages: [
          {role: 'system', content: EXTRACTION_SYSTEM_PROMPT},
          {
            role: 'user',
            content: `Today's date: ${today}\n\nMessage: "${text}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('AI extraction request failed');
    }

    const raw = (await response.json()) as OpenAIResponse;
    const content = raw.choices?.[0]?.message?.content ?? '{}';

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException('Failed to parse AI extraction response');
    }

    return {
      extractedData: {
        procedure: parsed.procedure as string | undefined,
        date: parsed.date as string | undefined,
        time: parsed.time as string | undefined,
        patientName: parsed.patientName as string | undefined,
        notes: parsed.notes as string | undefined,
      },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  }
}
