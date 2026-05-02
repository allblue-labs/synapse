import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { OpenAiProvider } from './providers/openai.provider';

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeBase: KnowledgeBaseService,
    private readonly openAiProvider: OpenAiProvider
  ) {}

  async generateReply(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        agent: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20
        }
      }
    });

    if (!conversation?.agent) {
      throw new NotFoundException('Conversation or agent not found.');
    }

    const latestUserText = [...conversation.messages].reverse().find((message) => message.direction === 'INBOUND')?.content ?? '';
    const knowledge = await this.knowledgeBase.searchForAgent(tenantId, conversation.agent.id, latestUserText);
    const systemPrompt = [
      `You are ${conversation.agent.name}.`,
      `Business goal: ${conversation.agent.goal}.`,
      `Personality: ${conversation.agent.personality}.`,
      `Instructions: ${conversation.agent.instructions}.`,
      conversation.agent.rules.length ? `Rules:\n${conversation.agent.rules.map((rule) => `- ${rule}`).join('\n')}` : '',
      knowledge.length ? `Relevant knowledge:\n${knowledge.map((item) => `# ${item.title}\n${item.content}`).join('\n\n')}` : '',
      'Respond clearly, pursue the business outcome, and escalate when confidence is low.'
    ].filter(Boolean).join('\n\n');

    return this.openAiProvider.generate({
      model: conversation.agent.modelName,
      temperature: conversation.agent.temperature,
      systemPrompt,
      messages: conversation.messages.map((message) => ({
        role: message.direction === 'INBOUND' ? 'user' : 'assistant',
        content: message.content
      }))
    });
  }
}
