import { Module } from '@nestjs/common';
import { KnowledgeBaseModule } from '../../modules/knowledge-base/knowledge-base.module';
import { AiOrchestratorModule } from '../../modules/ai-orchestrator/ai-orchestrator.module';

@Module({
  imports: [KnowledgeBaseModule, AiOrchestratorModule],
  exports: [AiOrchestratorModule]
})
export class CoreIntelligenceModule {}
