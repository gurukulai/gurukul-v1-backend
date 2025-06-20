// src/query/query-intelligence.service.ts
import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class QueryIntelligenceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async shouldUseVectorSearch(query: string): Promise<{
    useVector: boolean;
    reasoning: string;
    confidence: number;
  }> {
    const prompt = `
    Analyze the following user query and determine if it requires semantic/vector search or if it can be answered with traditional keyword search or direct factual lookup.

    Vector search is needed for:
    - Conceptual questions requiring understanding
    - Questions about similarities or relationships
    - Complex reasoning or analysis requests
    - Contextual information retrieval

    Traditional search is sufficient for:
    - Simple factual lookups
    - Exact matches (IDs, codes, specific names)
    - Basic filtering operations
    - Mathematical calculations

    Query: "${query}"

    Respond with JSON only:
    {
      "useVector": boolean,
      "reasoning": "brief explanation",
      "confidence": number (0-1)
    }
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    try {
      return JSON.parse(response.choices[0].message.content ?? '{}') as {
        useVector: boolean;
        reasoning: string;
        confidence: number;
      };
    } catch {
      // Fallback to vector search if parsing fails
      return {
        useVector: true,
        reasoning: 'Failed to parse response, defaulting to vector search',
        confidence: 0.5,
      };
    }
  }
}
