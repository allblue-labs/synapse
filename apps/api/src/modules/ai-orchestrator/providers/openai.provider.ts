import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmGenerateInput, LlmGenerateOutput, LlmProvider } from './llm-provider.interface';

@Injectable()
export class OpenAiProvider implements LlmProvider {
  constructor(private readonly config: ConfigService) {}

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('OpenAI API key is not configured.');
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: input.model,
        temperature: input.temperature,
        input: [
          {
            role: 'system',
            content: input.systemPrompt
          },
          ...input.messages
        ]
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('OpenAI request failed.');
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const output = raw.output as Array<{ content?: Array<{ text?: string }> }> | undefined;
    const text = output?.flatMap((item) => item.content ?? []).map((content) => content.text ?? '').join('\n').trim() ?? '';

    return {
      text,
      raw,
      usage: this.parseUsage(raw)
    };
  }

  private parseUsage(raw: Record<string, unknown>) {
    const usage = raw.usage as Record<string, unknown> | undefined;
    if (!usage) {
      return undefined;
    }

    return {
      inputTokens: Number(usage.input_tokens ?? 0),
      outputTokens: Number(usage.output_tokens ?? 0),
      totalTokens: Number(usage.total_tokens ?? 0)
    };
  }
}
