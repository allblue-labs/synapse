import { Injectable } from '@nestjs/common';
import type { AiAgentResponse } from '@synapse/contracts';

@Injectable()
export class AiResponseParserService {
  parse(text: string): AiAgentResponse {
    try {
      const parsed = JSON.parse(text) as Partial<AiAgentResponse>;
      if (typeof parsed.reply === 'string') {
        return {
          reply: parsed.reply,
          leadExtraction: parsed.leadExtraction,
          intent: parsed.intent,
          shouldEscalate: parsed.shouldEscalate,
          metadata: parsed.metadata
        };
      }
    } catch {
      // Providers may return plain text until structured output is enforced.
    }

    return {
      reply: text,
      metadata: {
        parserFallback: 'plain_text'
      }
    };
  }
}
