import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { EmbeddingsService } from './embeddings.service';
import { SearchController } from './search.controller';
import { SemanticSearchService } from './semantic-search.service';

@Module({
  imports: [AiModule],
  controllers: [SearchController],
  providers: [EmbeddingsService, SemanticSearchService],
  exports: [EmbeddingsService, SemanticSearchService],
})
export class SearchModule {}
