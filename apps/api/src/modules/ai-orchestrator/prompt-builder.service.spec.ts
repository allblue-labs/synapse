import { Agent, AgentGoal, AgentStatus } from '@prisma/client';
import { PromptBuilderService } from './prompt-builder.service';

describe('PromptBuilderService', () => {
  it('injects business goal, rules, and knowledge context', () => {
    const service = new PromptBuilderService();
    const agent: Agent = {
      id: 'agent_1',
      tenantId: 'tenant_1',
      name: 'Sales qualifier',
      status: AgentStatus.ACTIVE,
      goal: AgentGoal.SALES,
      personality: 'Precise and consultative',
      instructions: 'Qualify enterprise leads.',
      rules: ['Never invent pricing.', 'Escalate legal questions.'],
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
      temperature: 0.3,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const prompt = service.buildSystemPrompt({
      agent,
      knowledge: [
        {
          id: 'knowledge_1',
          tenantId: 'tenant_1',
          agentId: 'agent_1',
          title: 'Pricing policy',
          content: 'Enterprise pricing requires sales review.',
          sourceUrl: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    expect(prompt).toContain('Primary business goal: SALES');
    expect(prompt).toContain('Never invent pricing.');
    expect(prompt).toContain('Enterprise pricing requires sales review.');
  });
});
