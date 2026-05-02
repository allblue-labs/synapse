import { Injectable } from '@nestjs/common';
import type { LlmRoutingPolicy } from '@synapse/contracts';
import { LlmGenerateInput } from '../../../modules/ai-orchestrator/providers/llm-provider.interface';
import { OpenAiProvider } from '../../../modules/ai-orchestrator/providers/openai.provider';
import { JsonLoggerService } from '../../../common/logging/json-logger.service';

@Injectable()
export class LlmPoolService {
  constructor(
    private readonly openAiProvider: OpenAiProvider,
    private readonly logger: JsonLoggerService
  ) {}

  generate(input: LlmGenerateInput, policy: LlmRoutingPolicy) {
    const provider = this.selectProvider(policy);
    this.logger.write({
      level: 'log',
      context: 'LlmPool',
      message: 'llm_route_selected',
      metadata: {
        provider,
        taskType: policy.taskType,
        privacy: policy.privacy,
        model: input.model
      }
    });

    return this.openAiProvider.generate(input);
  }

  private selectProvider(policy: LlmRoutingPolicy) {
    if (policy.privacy === 'private') {
      return 'openai';
    }

    // OpenAI is the first route. Local/private providers will join this strategy behind the same interface.
    return 'openai';
  }
}
