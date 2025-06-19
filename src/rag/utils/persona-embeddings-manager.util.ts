import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ProcessedDocument,
  SearchResult,
  SearchOptions,
  DocumentMetadata,
  DocumentType,
} from '../interfaces/rag.interface';
import { AiPersonaType } from '../../ai-personas/interfaces/ai-persona.interface';

interface SupabaseDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding: number[];
  created_at: string;
}

interface SupabaseSearchResult {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding: number[];
  similarity: number;
}

interface SupabaseInsertResult {
  id: string;
}

interface PersonaTableConfig {
  tableName: string;
  searchFunction: string;
  displayName: string;
}

@Injectable()
export class PersonaEmbeddingsManager {
  private readonly logger = new Logger(PersonaEmbeddingsManager.name);
  private readonly supabase: SupabaseClient;
  private readonly embeddings: OpenAIEmbeddings;
  private readonly EMBEDDING_DIMENSION = 1536; // For text-embedding-3-small

  // Persona-specific table configuration
  // For now, using the main documents table with persona filtering
  private readonly PERSONA_CONFIG: Record<AiPersonaType, PersonaTableConfig> = {
    PRIYA: {
      tableName: 'documents',
      searchFunction: 'match_documents',
      displayName: 'AI Girlfriend (Priya)',
    },
    THERAPIST: {
      tableName: 'documents',
      searchFunction: 'match_documents',
      displayName: 'AI Therapist',
    },
    DIETICIAN: {
      tableName: 'documents',
      searchFunction: 'match_documents',
      displayName: 'AI Dietician',
    },
    CAREER: {
      tableName: 'documents',
      searchFunction: 'match_documents',
      displayName: 'AI Career Counselor',
    },
  };

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
   * Get table name for a specific persona
   */
  private getPersonaTableName(personaType: AiPersonaType): string {
    return this.PERSONA_CONFIG[personaType].tableName;
  }

  /**
   * Get search function name for a specific persona
   */
  private getPersonaSearchFunction(personaType: AiPersonaType): string {
    return this.PERSONA_CONFIG[personaType].searchFunction;
  }

  /**
   * Generate embedding for a text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await this.embeddings.embedDocuments(texts);
    return embeddings;
  }

  /**
   * Store document in persona-specific table
   */
  async storeDocument(
    document: ProcessedDocument,
    personaType: AiPersonaType,
  ): Promise<string> {
    // Generate embedding if not provided
    if (!document.embedding) {
      document.embedding = await this.generateEmbedding(document.content);
    }

    const tableName = this.getPersonaTableName(personaType);

    // Add persona type to metadata for filtering
    const metadata = {
      ...document.metadata,
      persona: personaType,
      persona_specific: true,
    };

    // Store in Supabase - pass vector array directly to pgvector
    const { data, error } = await this.supabase
      .from(tableName)
      .insert([
        {
          content: document.content,
          embedding: document.embedding,
          metadata: metadata,
          created_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Supabase error for ${personaType}:`, error);
      throw error;
    }

    this.logger.log(
      `Document stored in ${this.PERSONA_CONFIG[personaType].displayName} database with ID: ${(data as SupabaseInsertResult).id}`,
    );
    return (data as SupabaseInsertResult).id;
  }

  /**
   * Store multiple documents efficiently in persona-specific table
   */
  async storeDocuments(
    documents: ProcessedDocument[],
    personaType: AiPersonaType,
  ): Promise<string[]> {
    if (documents.length === 0) {
      return [];
    }

    // Generate embeddings for all documents
    const contents = documents.map((doc) => doc.content);
    const embeddings = await this.generateEmbeddings(contents);

    // Prepare documents for batch insert
    const documentsWithEmbeddings = documents.map((doc, index) => ({
      content: doc.content,
      embedding: embeddings[index],
      metadata: {
        ...doc.metadata,
        persona: personaType,
        persona_specific: true,
      },
      created_at: new Date().toISOString(),
    }));

    const tableName = this.getPersonaTableName(personaType);

    // Batch insert
    const { data, error } = await this.supabase
      .from(tableName)
      .insert(documentsWithEmbeddings)
      .select('id');

    if (error) {
      this.logger.error(
        `Supabase batch insert error for ${personaType}:`,
        error,
      );
      throw error;
    }

    const ids = (data as SupabaseInsertResult[]).map((item) => item.id);
    this.logger.log(
      `Stored ${ids.length} documents in ${this.PERSONA_CONFIG[personaType].displayName} database`,
    );
    return ids;
  }

  /**
   * Search for similar documents in persona-specific database
   */
  async searchSimilarDocuments(
    query: string,
    personaType: AiPersonaType,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const {
      limit = 5,
      threshold = 0.7,
      category,
      documentType,
      includeMetadata = true,
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    try {
      // Use persona-specific RPC function with persona filtering
      const searchFunction = this.getPersonaSearchFunction(personaType);

      let rpcQuery = this.supabase.rpc(searchFunction, {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
      });

      const { data, error } = await rpcQuery;

      if (error) {
        this.logger.warn(
          `RPC function ${searchFunction} failed, falling back to manual search:`,
          error.message,
        );
        throw error;
      }

      // Transform results and apply additional filters
      let searchResults: SearchResult[] = (data as SupabaseSearchResult[])
        // First filter by persona
        .filter(
          (item) =>
            item.metadata?.personaType === personaType ||
            item.metadata?.persona === personaType,
        )
        .map((item) => ({
          document: {
            id: item.id,
            content: item.content,
            metadata: includeMetadata
              ? item.metadata
              : { documentType: DocumentType.TEXT },
            embedding: item.embedding,
          },
          similarity: item.similarity,
          relevanceScore: this.calculateRelevanceScore(
            item.similarity,
            item.metadata,
          ),
        }));

      // Apply additional filters if provided
      if (category) {
        searchResults = searchResults.filter(
          (result) => result.document.metadata.category === category,
        );
      }

      if (documentType) {
        searchResults = searchResults.filter(
          (result) => result.document.metadata.documentType === documentType,
        );
      }

      this.logger.log(
        `Found ${searchResults.length} similar documents in ${this.PERSONA_CONFIG[personaType].displayName} database`,
      );
      return searchResults;
    } catch (error) {
      // Fallback: fetch all documents and calculate similarity manually
      this.logger.log(
        `Using fallback similarity calculation for ${personaType}`,
      );
      return await this.fallbackSimilaritySearch(
        queryEmbedding,
        personaType,
        options,
      );
    }
  }

  /**
   * Fallback similarity search when RPC function is not available
   */
  private async fallbackSimilaritySearch(
    queryEmbedding: number[],
    personaType: AiPersonaType,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const {
      limit = 5,
      threshold = 0.7,
      category,
      documentType,
      includeMetadata = true,
    } = options;

    const tableName = this.getPersonaTableName(personaType);

    // Fetch all documents from persona-specific table
    let query = this.supabase
      .from(tableName)
      .select('id, content, metadata, embedding')
      .eq('metadata->>persona', personaType);

    // Apply filters
    if (category) {
      query = query.filter('metadata->category', 'eq', category);
    }
    if (documentType) {
      query = query.filter('metadata->documentType', 'eq', documentType);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Fallback search error for ${personaType}:`, error);
      throw error;
    }

    // Calculate similarities manually
    const resultsWithSimilarity = (data as SupabaseDocument[])
      .map((doc) => {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        return {
          document: {
            id: doc.id,
            content: doc.content,
            metadata: includeMetadata
              ? doc.metadata
              : { documentType: DocumentType.TEXT },
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
      `Found ${resultsWithSimilarity.length} similar documents using fallback for ${this.PERSONA_CONFIG[personaType].displayName}`,
    );
    return resultsWithSimilarity;
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
   * Delete document from persona-specific table
   */
  async deleteDocument(
    documentId: string,
    personaType: AiPersonaType,
  ): Promise<void> {
    const tableName = this.getPersonaTableName(personaType);

    const { error } = await this.supabase
      .from(tableName)
      .delete()
      .eq('id', documentId);

    if (error) {
      this.logger.error(`Delete error for ${personaType}:`, error);
      throw error;
    }

    this.logger.log(
      `Document ${documentId} deleted from ${this.PERSONA_CONFIG[personaType].displayName} database`,
    );
  }

  /**
   * Update document metadata in persona-specific table
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: Partial<DocumentMetadata>,
    personaType: AiPersonaType,
  ): Promise<void> {
    const tableName = this.getPersonaTableName(personaType);

    const { error } = await this.supabase
      .from(tableName)
      .update({ metadata })
      .eq('id', documentId);

    if (error) {
      this.logger.error(`Update metadata error for ${personaType}:`, error);
      throw error;
    }

    this.logger.log(
      `Document ${documentId} metadata updated in ${this.PERSONA_CONFIG[personaType].displayName} database`,
    );
  }

  /**
   * Calculate relevance score based on similarity and metadata
   */
  private calculateRelevanceScore(
    similarity: number,
    metadata: DocumentMetadata,
  ): number {
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

    // Boost score for documents with specific categories
    if (metadata.category) {
      score += 0.05;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get document statistics for a specific persona
   */
  async getPersonaDocumentStats(personaType: AiPersonaType): Promise<{
    totalDocuments: number;
    documentsByCategory: Record<string, number>;
    latestDocumentDate: string | null;
  }> {
    const tableName = this.getPersonaTableName(personaType);

    const { data, error } = await this.supabase
      .from(tableName)
      .select('metadata, created_at')
      .eq('metadata->>persona', personaType);

    if (error) {
      this.logger.error(`Stats error for ${personaType}:`, error);
      throw error;
    }

    const documents = data as {
      metadata: DocumentMetadata;
      created_at: string;
    }[];

    const documentsByCategory: Record<string, number> = {};
    let latestDocumentDate: string | null = null;

    documents.forEach((doc) => {
      const category = doc.metadata.category || 'uncategorized';
      documentsByCategory[category] = (documentsByCategory[category] || 0) + 1;

      if (!latestDocumentDate || doc.created_at > latestDocumentDate) {
        latestDocumentDate = doc.created_at;
      }
    });

    return {
      totalDocuments: documents.length,
      documentsByCategory,
      latestDocumentDate,
    };
  }

  /**
   * Get statistics for all personas
   */
  async getAllPersonasStats(): Promise<
    Record<
      AiPersonaType,
      {
        totalDocuments: number;
        documentsByCategory: Record<string, number>;
        latestDocumentDate: string | null;
      }
    >
  > {
    const stats: Record<string, any> = {};

    for (const personaType of Object.keys(
      this.PERSONA_CONFIG,
    ) as AiPersonaType[]) {
      try {
        stats[personaType] = await this.getPersonaDocumentStats(personaType);
      } catch (error) {
        this.logger.error(`Failed to get stats for ${personaType}:`, error);
        stats[personaType] = {
          totalDocuments: 0,
          documentsByCategory: {},
          latestDocumentDate: null,
        };
      }
    }

    return stats;
  }

  /**
   * Clear all documents for a specific persona
   */
  async clearPersonaDocuments(personaType: AiPersonaType): Promise<number> {
    const tableName = this.getPersonaTableName(personaType);

    const { count, error } = await this.supabase
      .from(tableName)
      .delete()
      .eq('metadata->>persona', personaType);

    if (error) {
      this.logger.error(`Clear documents error for ${personaType}:`, error);
      throw error;
    }

    const deletedCount = count || 0;
    this.logger.log(
      `Cleared ${deletedCount} documents from ${this.PERSONA_CONFIG[personaType].displayName} database`,
    );
    return deletedCount;
  }

  /**
   * Debug method to get raw documents and check embeddings for a persona
   */
  async debugGetPersonaDocuments(personaType: AiPersonaType) {
    const tableName = this.getPersonaTableName(personaType);

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('metadata->>persona', personaType)
        .limit(10);

      if (error) {
        this.logger.error(`Debug documents error for ${personaType}:`, error);
        throw error;
      }

      const debugInfo = {
        personaType,
        tableName,
        documentsFound: data?.length || 0,
        sampleDocuments:
          data?.map((doc: any) => ({
            id: doc.id,
            contentPreview: doc.content.substring(0, 100) + '...',
            embeddingDimension: doc.embedding?.length || 0,
            metadata: doc.metadata,
            createdAt: doc.created_at,
          })) || [],
        hasEmbeddings:
          data?.every(
            (doc: any) => doc.embedding && doc.embedding.length > 0,
          ) || false,
        avgEmbeddingLength:
          data?.length > 0
            ? data.reduce(
                (sum: number, doc: any) => sum + (doc.embedding?.length || 0),
                0,
              ) / data.length
            : 0,
      };

      this.logger.log(
        `Debug info for ${this.PERSONA_CONFIG[personaType].displayName}: ${JSON.stringify(debugInfo, null, 2)}`,
      );
      return debugInfo;
    } catch (error) {
      const errorInfo = {
        personaType,
        tableName,
        error: error instanceof Error ? error.message : String(error),
      };
      this.logger.error(`Debug error for ${personaType}:`, error);
      return errorInfo;
    }
  }
}
