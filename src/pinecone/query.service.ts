// src/query/query.service.ts
import { Injectable } from '@nestjs/common';
import { PineconeService } from './pinecone.service';
import { ExpertsService } from './experts.service';
import { QueryIntelligenceService } from './query-intelligence.service';

@Injectable()
export class QueryService {
  constructor(
    private pineconeService: PineconeService,
    private expertsService: ExpertsService,
    private queryIntelligenceService: QueryIntelligenceService,
  ) {}

  async queryExpert(
    expertId: string,
    query: string,
    options: { topK?: number; forceVector?: boolean } = {},
  ): Promise<{
    results: {
      content: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }[];
    usedVectorSearch: boolean;
    reasoning?: string;
    expert: string;
  }> {
    const expert = this.expertsService.getExpert(expertId);

    if (!expert) {
      throw new Error(`Expert class with ID ${expertId} not found`);
    }

    // Check if expert class is active
    if (expert.isActive === false) {
      throw new Error(`Expert class ${expert.name} is currently inactive`);
    }

    let usedVectorSearch = false;
    let reasoning = '';

    // Check if vector search is needed (unless forced)
    if (!options.forceVector) {
      const intelligence =
        await this.queryIntelligenceService.shouldUseVectorSearch(query);
      usedVectorSearch = intelligence.useVector;
      reasoning = intelligence.reasoning;
    } else {
      usedVectorSearch = true;
      reasoning = 'Vector search forced by user';
    }

    let results = [];

    if (usedVectorSearch) {
      results = await this.pineconeService.queryExpert(
        expert.namespace,
        query,
        options.topK || 5,
      );
    } else {
      // For non-vector queries, you might implement traditional search
      // or return a message indicating no vector search was needed
      results = [
        {
          content: `Query "${query}" determined to not require vector search.`,
          metadata: { queryType: 'traditional' },
          similarity: 1.0,
        },
      ];
    }

    return {
      results,
      usedVectorSearch,
      reasoning,
      expert: expert.name,
    };
  }
}
