import { Injectable } from '@nestjs/common';
import { Agent, KnowledgeItem, Message } from '@prisma/client';

type BuildPromptInput = {
  agent: Agent;
  knowledge: KnowledgeItem[];
};

@Injectable()
export class PromptBuilderService {
  buildSystemPrompt(input: BuildPromptInput): string {
    const { agent, knowledge } = input;

    return [
      `You are ${agent.name}, an AI business agent in Synapse.`,
      `Primary business goal: ${agent.goal}.`,
      `Personality: ${agent.personality}.`,
      `Operating instructions: ${agent.instructions}.`,
      agent.rules.length ? `Rules:\n${agent.rules.map((rule) => `- ${rule}`).join('\n')}` : '',
      knowledge.length ? `Knowledge context:\n${knowledge.map((item) => `# ${item.title}\n${item.content}`).join('\n\n')}` : '',
      [
        'Return a helpful response that moves the conversation toward the business goal.',
        'Extract lead signals when present.',
        'Classify intent when possible.',
        'Recommend escalation when confidence is low or the user needs a human.'
      ].join('\n')
    ].filter(Boolean).join('\n\n');
  }

  selectConversationHistory(messages: Message[], limit = 20) {
    return messages.slice(-limit).map((message) => ({
      role: message.direction === 'INBOUND' ? ('user' as const) : ('assistant' as const),
      content: message.content
    }));
  }
}
