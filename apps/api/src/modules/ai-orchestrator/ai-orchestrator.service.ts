import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { AiResponseParserService } from './ai-response-parser.service';
import { PromptBuilderService } from './prompt-builder.service';
import { LlmPoolService } from '../../core/intelligence/llm-pool/llm-pool.service';

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeBase: KnowledgeBaseService,
    private readonly llmPool: LlmPoolService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly responseParser: AiResponseParserService
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
    const systemPrompt = this.promptBuilder.buildSystemPrompt({
      agent: conversation.agent,
      knowledge
    });

    const output = await this.llmPool.generate(
      {
        model: conversation.agent.modelName,
        temperature: conversation.agent.temperature,
        systemPrompt,
        messages: this.promptBuilder.selectConversationHistory(conversation.messages)
      },
      {
        taskType: 'conversation_reply',
        privacy: 'standard',
        maxCostTier: 'medium'
      }
    );

    return {
      ...output,
      parsed: this.responseParser.parse(output.text)
    };
  }
}
