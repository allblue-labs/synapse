export type LlmGenerateInput = {
  model: string;
  systemPrompt: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  temperature: number;
};

export type LlmGenerateOutput = {
  text: string;
  raw: Record<string, unknown>;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export interface LlmProvider {
  generate(input: LlmGenerateInput): Promise<LlmGenerateOutput>;
}
