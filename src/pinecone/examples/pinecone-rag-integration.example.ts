import { Injectable, Logger } from '@nestjs/common';
import { PineconeService } from '../pinecone.service';
import {
  chunkText,
  chunksToDocuments,
  validateDocument,
  generateDocumentId,
} from '../utils/pinecone.utils';

/**
 * Example integration of Pinecone with RAG system
 * This demonstrates how to use Pinecone as an alternative to Supabase for vector storage
 */

@Injectable()
export class PineconeRAGIntegration {
  private readonly logger = new Logger(PineconeRAGIntegration.name);

  constructor(private readonly pineconeService: PineconeService) {}

  /**
   * Add knowledge base documents to Pinecone
   */
  async addKnowledgeBase(
    documents: Array<{ content: string; metadata?: Record<string, unknown> }>,
    namespace: string = 'knowledge-base',
  ): Promise<void> {
    this.logger.log(`Adding ${documents.length} documents to knowledge base`);

    for (const [index, doc] of documents.entries()) {
      try {
        // Validate document
        const validation = validateDocument({
          id: `kb-${index}`,
          content: doc.content,
          metadata: doc.metadata,
        });

        if (!validation.isValid) {
          this.logger.warn(
            `Document ${index} validation failed:`,
            validation.errors,
          );
          continue;
        }

        // Add document to Pinecone
        await this.pineconeService.addDocument({
          id: `kb-${index}`,
          content: doc.content,
          metadata: {
            ...doc.metadata,
            type: 'knowledge-base',
            index,
            addedAt: new Date().toISOString(),
          },
          namespace,
        });

        this.logger.log(`Added document ${index} to knowledge base`);
      } catch (error) {
        this.logger.error(`Failed to add document ${index}:`, error);
      }
    }
  }

  /**
   * Add large documents with automatic chunking
   */
  async addLargeDocuments(
    documents: Array<{
      id: string;
      content: string;
      metadata?: Record<string, unknown>;
    }>,
    namespace: string = 'large-documents',
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
  ): Promise<void> {
    this.logger.log(`Processing ${documents.length} large documents`);

    for (const doc of documents) {
      try {
        await this.pineconeService.addLargeDocument(
          doc.id,
          doc.content,
          {
            ...doc.metadata,
            type: 'large-document',
            originalSize: doc.content.length,
          },
          namespace,
          chunkSize,
          chunkOverlap,
        );

        this.logger.log(`Processed large document: ${doc.id}`);
      } catch (error) {
        this.logger.error(`Failed to process large document ${doc.id}:`, error);
      }
    }
  }

  /**
   * Search knowledge base with context
   */
  async searchKnowledgeBase(
    query: string,
    context: string = 'general',
    k: number = 5,
    minScore: number = 0.7,
  ): Promise<
    Array<{
      content: string;
      score: number;
      metadata?: Record<string, unknown>;
    }>
  > {
    try {
      const results = await this.pineconeService.hybridSearch(
        query,
        k,
        `knowledge-base-${context}`,
        { type: 'knowledge-base' },
        minScore,
      );

      this.logger.log(
        `Found ${results.length} relevant documents for query: "${query}"`,
      );

      return results.map((result) => ({
        content: result.content,
        score: result.score,
        metadata: result.metadata,
      }));
    } catch (error) {
      this.logger.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Multi-tenant document management
   */
  async addUserDocument(
    userId: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    const documentId = generateDocumentId(`user-${userId}`);

    try {
      await this.pineconeService.addDocument({
        id: documentId,
        content,
        metadata: {
          ...metadata,
          userId,
          type: 'user-document',
          addedAt: new Date().toISOString(),
        },
        namespace: `user-${userId}`,
      });

      this.logger.log(`Added document ${documentId} for user ${userId}`);
      return documentId;
    } catch (error) {
      this.logger.error(`Failed to add document for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Search user documents
   */
  async searchUserDocuments(
    userId: string,
    query: string,
    k: number = 10,
  ): Promise<
    Array<{
      content: string;
      score: number;
      metadata?: Record<string, unknown>;
    }>
  > {
    try {
      const results = await this.pineconeService.search(
        query,
        k,
        `user-${userId}`,
        { type: 'user-document' },
      );

      return results.map((result) => ({
        content: result.content,
        score: result.score,
        metadata: result.metadata,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to search documents for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Enhanced RAG with Pinecone
   */
  async enhancedRAG(
    query: string,
    context: string = 'general',
    includeUserDocs: boolean = false,
    userId?: string,
  ): Promise<{
    answer: string;
    sources: Array<{ content: string; score: number }>;
    confidence: number;
  }> {
    try {
      // Search knowledge base
      const kbResults = await this.searchKnowledgeBase(query, context, 3, 0.7);

      // Search user documents if requested
      let userResults: Array<{ content: string; score: number }> = [];
      if (includeUserDocs && userId) {
        const userDocs = await this.searchUserDocuments(userId, query, 2);
        userResults = userDocs.map((doc) => ({
          content: doc.content,
          score: doc.score,
        }));
      }

      // Combine results
      const allResults = [...kbResults, ...userResults];
      const sources = allResults.map((result) => ({
        content: result.content,
        score: result.score,
      }));

      // Calculate confidence based on average score
      const confidence =
        allResults.length > 0
          ? allResults.reduce((sum, result) => sum + result.score, 0) /
            allResults.length
          : 0;

      // Generate answer (this would typically use an LLM)
      const answer = this.generateAnswerFromSources(query, sources);

      return {
        answer,
        sources,
        confidence,
      };
    } catch (error) {
      this.logger.error('Enhanced RAG failed:', error);
      return {
        answer: 'Sorry, I encountered an error while processing your request.',
        sources: [],
        confidence: 0,
      };
    }
  }

  /**
   * Generate answer from sources (simplified example)
   */
  private generateAnswerFromSources(
    query: string,
    sources: Array<{ content: string; score: number }>,
  ): string {
    if (sources.length === 0) {
      return 'I could not find relevant information to answer your question.';
    }

    // Simple answer generation - in practice, you'd use an LLM here
    const topSource = sources[0];
    return `Based on the available information: ${topSource.content.substring(0, 200)}...`;
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<{
    totalDocuments: number;
    namespaces: string[];
    health: string;
  }> {
    try {
      const stats = await this.pineconeService.getStats();
      const health = await this.pineconeService.healthCheck();

      return {
        totalDocuments: stats.totalVectors,
        namespaces: stats.namespaces,
        health: health.status,
      };
    } catch (error) {
      this.logger.error('Failed to get system stats:', error);
      return {
        totalDocuments: 0,
        namespaces: [],
        health: 'unhealthy',
      };
    }
  }

  /**
   * Clean up user data
   */
  async cleanupUserData(userId: string): Promise<void> {
    try {
      await this.pineconeService.deleteNamespace(`user-${userId}`);
      this.logger.log(`Cleaned up data for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup data for user ${userId}:`, error);
      throw error;
    }
  }
}

/**
 * Usage example:
 *
 * // In your service
 * constructor(private readonly pineconeRAG: PineconeRAGIntegration) {}
 *
 * // Add knowledge base
 * await this.pineconeRAG.addKnowledgeBase([
 *   { content: 'Machine learning is a subset of AI...', metadata: { category: 'AI' } },
 *   { content: 'Deep learning uses neural networks...', metadata: { category: 'AI' } }
 * ], 'ai-knowledge');
 *
 * // Search
 * const results = await this.pineconeRAG.searchKnowledgeBase(
 *   'What is machine learning?',
 *   'ai-knowledge'
 * );
 *
 * // Enhanced RAG
 * const answer = await this.pineconeRAG.enhancedRAG(
 *   'How does deep learning work?',
 *   'ai-knowledge',
 *   true,
 *   'user123'
 * );
 */
