import { Module } from '@nestjs/common';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { OpenAiProvider } from './providers/openai.provider';

@Module({
  imports: [KnowledgeBaseModule],
  providers: [AiOrchestratorService, OpenAiProvider],
  exports: [AiOrchestratorService]
})
export class AiOrchestratorModule {}
