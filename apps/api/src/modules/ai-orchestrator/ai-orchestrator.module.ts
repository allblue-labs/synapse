import { Module } from '@nestjs/common';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiResponseParserService } from './ai-response-parser.service';
import { PromptBuilderService } from './prompt-builder.service';
import { OpenAiProvider } from './providers/openai.provider';
import { LlmPoolService } from '../../core/intelligence/llm-pool/llm-pool.service';

@Module({
  imports: [KnowledgeBaseModule],
  providers: [AiOrchestratorService, PromptBuilderService, AiResponseParserService, OpenAiProvider, LlmPoolService],
  exports: [AiOrchestratorService, LlmPoolService]
})
export class AiOrchestratorModule {}
