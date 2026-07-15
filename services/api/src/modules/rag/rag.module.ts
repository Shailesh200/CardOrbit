import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { SearchModule } from '../search/search.module';
import { ContextEngineService } from './context-engine.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

@Module({
  imports: [AiModule, SearchModule, KnowledgeGraphModule],
  controllers: [RagController],
  providers: [ContextEngineService, RagService],
  exports: [ContextEngineService, RagService],
})
export class RagModule {}
