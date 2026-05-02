import { Module } from '@nestjs/common';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiResponseParserService } from './ai-response-parser.service';
import { PromptBuilderService } from './prompt-builder.service';
import { OpenAiProvider } from './providers/openai.provider';

@Module({
  imports: [KnowledgeBaseModule],
  providers: [AiOrchestratorService, PromptBuilderService, AiResponseParserService, OpenAiProvider],
  exports: [AiOrchestratorService]
})
export class AiOrchestratorModule {}
