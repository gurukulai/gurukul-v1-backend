import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ProcessedDocument,
  SearchResult,
  SearchOptions,
} from '../interfaces/rag.interface';

@Injectable()
export class EmbeddingsManager {
  private readonly logger = new Logger(EmbeddingsManager.name);
  private readonly supabase: SupabaseClient;
  private readonly embeddings: OpenAIEmbeddings;
  private readonly DOCUMENTS_TABLE = 'documents';
  private readonly EMBEDDING_DIMENSION = 1536; // For text-embedding-3-small

  constructor(private readonly configService: ConfigService) {
    // Initialize Supabase client
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || '',
      this.configService.get<string>('SUPABASE_ANON_KEY') || '',
    );

    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: 'text-embedding-3-small',
      dimensions: this.EMBEDDING_DIMENSION,
    });
  }

  /**
   * Generate embedding for a text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      this.logger.error('Error generating embeddings:', error);
      throw new Error(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Store document with embedding in Supabase
   */
  async storeDocument(document: ProcessedDocument): Promise<string> {
    try {
      // Generate embedding if not provided
      if (!document.embedding) {
        document.embedding = await this.generateEmbedding(document.content);
      }

      // Store in Supabase - pass vector array directly to pgvector
      const { data, error } = await this.supabase
        .from(this.DOCUMENTS_TABLE)
        .insert([
          {
            content: document.content,
            embedding: document.embedding, // pgvector will handle the conversion
            metadata: document.metadata,
            created_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single();

      if (error) {
        this.logger.error('Supabase error:', error);
        throw error;
      }

      this.logger.log(`Document stored with ID: ${data.id}`);
      return data.id;
    } catch (error) {
      this.logger.error('Error storing document:', error);
      throw new Error(
        `Failed to store document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Store multiple documents efficiently
   */
  async storeDocuments(documents: ProcessedDocument[]): Promise<string[]> {
    try {
      // Generate embeddings for all documents
      const contents = documents.map((doc) => doc.content);
      const embeddings = await this.generateEmbeddings(contents);

      // Prepare documents for batch insert - pass arrays directly to pgvector
      const documentsWithEmbeddings = documents.map((doc, index) => ({
        content: doc.content,
        embedding: embeddings[index], // pgvector will handle the conversion
        metadata: doc.metadata,
        created_at: new Date().toISOString(),
      }));

      // Batch insert
      const { data, error } = await this.supabase
        .from(this.DOCUMENTS_TABLE)
        .insert(documentsWithEmbeddings)
        .select('id');

      if (error) {
        this.logger.error('Supabase batch insert error:', error);
        throw error;
      }

      const ids = data.map((item: any) => item.id);
      this.logger.log(`Stored ${ids.length} documents`);
      return ids;
    } catch (error) {
      this.logger.error('Error storing documents:', error);
      throw new Error(
        `Failed to store documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  async searchSimilarDocuments(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    try {
      const {
        limit = 5,
        threshold = 0.7,
        personaType,
        category,
        documentType,
        includeMetadata = true,
      } = options;

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      try {
        // Try using the RPC function first
        let rpcQuery = this.supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: limit,
        });

        // Apply filters if provided
        if (personaType) {
          rpcQuery = rpcQuery.filter(
            'metadata->personaType',
            'eq',
            personaType,
          );
        }

        if (category) {
          rpcQuery = rpcQuery.filter('metadata->category', 'eq', category);
        }

        if (documentType) {
          rpcQuery = rpcQuery.filter(
            'metadata->documentType',
            'eq',
            documentType,
          );
        }

        const { data, error } = await rpcQuery;

        if (error) {
          this.logger.warn(
            'RPC function failed, falling back to manual search:',
            error.message,
          );
          throw error;
        }

        // Transform results
        const searchResults: SearchResult[] = data.map((item: any) => ({
          document: {
            id: item.id,
            content: item.content,
            metadata: includeMetadata ? item.metadata : {},
            embedding: item.embedding,
          },
          similarity: item.similarity,
          relevanceScore: this.calculateRelevanceScore(
            item.similarity,
            item.metadata,
          ),
        }));

        this.logger.log(
          `Found ${searchResults.length} similar documents using RPC`,
        );
        return searchResults;
      } catch (rpcError) {
        // Fallback: fetch all documents and calculate similarity manually
        this.logger.log('Using fallback similarity calculation');
        return await this.fallbackSimilaritySearch(queryEmbedding, options);
      }
    } catch (error) {
      this.logger.error('Error searching documents:', error);
      throw new Error(
        `Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Fallback similarity search when RPC function is not available
   */
  private async fallbackSimilaritySearch(
    queryEmbedding: number[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    try {
      const {
        limit = 5,
        threshold = 0.7,
        personaType,
        category,
        documentType,
        includeMetadata = true,
      } = options;

      // Fetch all documents
      let query = this.supabase
        .from(this.DOCUMENTS_TABLE)
        .select('id, content, metadata, embedding');

      // Apply filters
      if (personaType) {
        query = query.filter('metadata->personaType', 'eq', personaType);
      }
      if (category) {
        query = query.filter('metadata->category', 'eq', category);
      }
      if (documentType) {
        query = query.filter('metadata->documentType', 'eq', documentType);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Fallback search error:', error);
        throw error;
      }

      // Calculate similarities manually
      const resultsWithSimilarity = data
        .map((doc: any) => {
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            doc.embedding,
          );
          return {
            document: {
              id: doc.id,
              content: doc.content,
              metadata: includeMetadata ? doc.metadata : {},
              embedding: doc.embedding,
            },
            similarity,
            relevanceScore: this.calculateRelevanceScore(
              similarity,
              doc.metadata,
            ),
          };
        })
        .filter((result) => result.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      this.logger.log(
        `Found ${resultsWithSimilarity.length} similar documents using fallback`,
      );
      return resultsWithSimilarity;
    } catch (error) {
      this.logger.error('Fallback search error:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Delete a document by ID
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.DOCUMENTS_TABLE)
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      this.logger.log(`Document ${documentId} deleted`);
    } catch (error) {
      this.logger.error('Error deleting document:', error);
      throw new Error(
        `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: Partial<any>,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.DOCUMENTS_TABLE)
        .update({ metadata })
        .eq('id', documentId);

      if (error) throw error;

      this.logger.log(`Document ${documentId} metadata updated`);
    } catch (error) {
      this.logger.error('Error updating document metadata:', error);
      throw new Error(
        `Failed to update document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Calculate relevance score based on similarity and metadata
   */
  private calculateRelevanceScore(similarity: number, metadata: any): number {
    let score = similarity;

    // Boost score for recent documents
    if (metadata.createdAt) {
      const daysSinceCreation =
        (Date.now() - new Date(metadata.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 30) {
        score += 0.1; // Recent documents get a boost
      }
    }

    // Boost score for documents with specific personas
    if (metadata.personaType) {
      score += 0.05;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(): Promise<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    documentsByPersona: Record<string, number>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from(this.DOCUMENTS_TABLE)
        .select('metadata');

      if (error) throw error;

      const stats = {
        totalDocuments: data.length,
        documentsByType: {} as Record<string, number>,
        documentsByPersona: {} as Record<string, number>,
      };

      // Aggregate statistics
      data.forEach((doc) => {
        const metadata = doc.metadata || {};

        // Count by document type
        const docType = metadata.documentType || 'unknown';
        stats.documentsByType[docType] =
          (stats.documentsByType[docType] || 0) + 1;

        // Count by persona type
        const personaType = metadata.personaType || 'none';
        stats.documentsByPersona[personaType] =
          (stats.documentsByPersona[personaType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      this.logger.error('Error getting document statistics:', error);
      throw new Error(
        `Failed to get document statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Debug method to get raw documents and check embeddings
   */
  async debugGetDocuments() {
    try {
      const { data, error } = await this.supabase
        .from(this.DOCUMENTS_TABLE)
        .select('id, content, metadata, embedding')
        .limit(10);

      if (error) {
        this.logger.error('Debug documents error:', error);
        throw error;
      }

      const debugInfo = {
        totalDocuments: data.length,
        documentsWithEmbeddings: data.filter((doc) => doc.embedding !== null)
          .length,
        documentsWithoutEmbeddings: data.filter((doc) => doc.embedding === null)
          .length,
        sampleDocuments: data.map((doc) => ({
          id: doc.id,
          contentPreview: doc.content.substring(0, 100),
          metadata: doc.metadata,
          hasEmbedding: doc.embedding !== null,
          embeddingLength: doc.embedding ? doc.embedding.length : 0,
        })),
      };

      this.logger.log(`Debug info: ${JSON.stringify(debugInfo, null, 2)}`);
      return debugInfo;
    } catch (error) {
      this.logger.error('Error getting debug documents:', error);
      throw new Error(
        `Failed to get debug documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
