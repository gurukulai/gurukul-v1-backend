import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export interface PineconeDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  namespace?: string;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface PineconeStats {
  totalVectors: number;
  namespaces: string[];
  indexName: string;
  dimension: number;
}

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly logger = new Logger(PineconeService.name);
  private pinecone: Pinecone;
  private vectorStore: PineconeStore;
  private embeddings: OpenAIEmbeddings;
  private indexName: string;

  constructor(private readonly configService: ConfigService) {
    this.indexName =
      this.configService.get<string>('PINECONE_INDEX_NAME') || 'gurukul-index';

    this.pinecone = new Pinecone({
      apiKey: this.configService.get<string>('PINECONE_API_KEY'),
      environment: this.configService.get<string>('PINECONE_ENVIRONMENT'),
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: 'text-embedding-3-small',
    });
  }

  async onModuleInit() {
    try {
      await this.initializeVectorStore();
      this.logger.log('Pinecone service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Pinecone service:', error);
      throw error;
    }
  }

  /**
   * Initialize the Pinecone vector store
   */
  private async initializeVectorStore() {
    try {
      // Check if index exists, create if not
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.some(
        (index) => index.name === this.indexName,
      );

      if (!indexExists) {
        this.logger.log(`Creating Pinecone index: ${this.indexName}`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI text-embedding-3-small dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      }

      // Initialize vector store
      this.vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex: this.pinecone.index(this.indexName),
        },
      );

      this.logger.log(
        `Pinecone vector store initialized with index: ${this.indexName}`,
      );
    } catch (error) {
      this.logger.error('Error initializing vector store:', error);
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const index = this.pinecone.index(this.indexName);
        const stats = await index.describeIndexStats();

        if (stats.status?.ready) {
          this.logger.log('Pinecone index is ready');
          return;
        }
      } catch (error) {
        this.logger.warn(
          `Index not ready yet, attempt ${attempt + 1}/${maxAttempts}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error('Pinecone index failed to become ready within timeout');
  }

  /**
   * Add a single document to Pinecone
   */
  async addDocument(document: PineconeDocument): Promise<void> {
    try {
      const docs = [
        new Document({
          pageContent: document.content,
          metadata: {
            id: document.id,
            ...document.metadata,
          },
        }),
      ];

      await this.vectorStore.addDocuments(docs, {
        namespace: document.namespace,
      });

      this.logger.log(
        `Added document ${document.id} to namespace: ${document.namespace || 'default'}`,
      );
    } catch (error) {
      this.logger.error(`Error adding document ${document.id}:`, error);
      throw error;
    }
  }

  /**
   * Add multiple documents to Pinecone
   */
  async addDocuments(documents: PineconeDocument[]): Promise<void> {
    try {
      const docs = documents.map(
        (doc) =>
          new Document({
            pageContent: doc.content,
            metadata: {
              id: doc.id,
              ...doc.metadata,
            },
          }),
      );

      // Group documents by namespace
      const documentsByNamespace = new Map<string, Document[]>();

      documents.forEach((doc, index) => {
        const namespace = doc.namespace || 'default';
        if (!documentsByNamespace.has(namespace)) {
          documentsByNamespace.set(namespace, []);
        }
        documentsByNamespace.get(namespace)!.push(docs[index]);
      });

      // Add documents to each namespace
      for (const [namespace, docs] of documentsByNamespace) {
        await this.vectorStore.addDocuments(docs, { namespace });
        this.logger.log(
          `Added ${docs.length} documents to namespace: ${namespace}`,
        );
      }
    } catch (error) {
      this.logger.error('Error adding documents:', error);
      throw error;
    }
  }

  /**
   * Add a large text document with automatic chunking
   */
  async addLargeDocument(
    id: string,
    content: string,
    metadata?: Record<string, any>,
    namespace?: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
  ): Promise<void> {
    try {
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
        separators: ['\n\n', '\n', ' ', ''],
      });

      const chunks = await textSplitter.splitText(content);

      const documents = chunks.map((chunk, index) => ({
        id: `${id}-chunk-${index}`,
        content: chunk,
        metadata: {
          ...metadata,
          originalId: id,
          chunkIndex: index,
          totalChunks: chunks.length,
        },
        namespace,
      }));

      await this.addDocuments(documents);
      this.logger.log(`Added large document ${id} as ${chunks.length} chunks`);
    } catch (error) {
      this.logger.error(`Error adding large document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    k: number = 5,
    namespace?: string,
    filter?: Record<string, any>,
  ): Promise<SearchResult[]> {
    try {
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        k,
        {
          namespace,
          filter,
        },
      );

      return results.map(([doc, score]) => ({
        id: doc.metadata?.id || 'unknown',
        content: doc.pageContent,
        score: score,
        metadata: doc.metadata,
      }));
    } catch (error) {
      this.logger.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Search with hybrid approach (vector + metadata filtering)
   */
  async hybridSearch(
    query: string,
    k: number = 5,
    namespace?: string,
    metadataFilter?: Record<string, any>,
    minScore: number = 0.7,
  ): Promise<SearchResult[]> {
    try {
      const results = await this.search(
        query,
        k * 2,
        namespace,
        metadataFilter,
      );

      // Filter by minimum similarity score
      const filteredResults = results
        .filter((result) => result.score >= minScore)
        .slice(0, k);

      return filteredResults;
    } catch (error) {
      this.logger.error('Error in hybrid search:', error);
      throw error;
    }
  }

  /**
   * Delete documents by IDs
   */
  async deleteDocuments(ids: string[], namespace?: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.namespace(namespace || '').deleteMany(ids);

      this.logger.log(
        `Deleted ${ids.length} documents from namespace: ${namespace || 'default'}`,
      );
    } catch (error) {
      this.logger.error('Error deleting documents:', error);
      throw error;
    }
  }

  /**
   * Delete all documents in a namespace
   */
  async deleteNamespace(namespace: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.namespace(namespace).deleteAll();

      this.logger.log(`Deleted all documents from namespace: ${namespace}`);
    } catch (error) {
      this.logger.error(`Error deleting namespace ${namespace}:`, error);
      throw error;
    }
  }

  /**
   * Get statistics about the Pinecone index
   */
  async getStats(): Promise<PineconeStats> {
    try {
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();

      return {
        totalVectors: stats.totalVectorCount || 0,
        namespaces: Object.keys(stats.namespaces || {}),
        indexName: this.indexName,
        dimension: 1536,
      };
    } catch (error) {
      this.logger.error('Error getting Pinecone stats:', error);
      throw error;
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    id: string,
    metadata: Record<string, any>,
    namespace?: string,
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.namespace(namespace || '').update({
        id,
        setMetadata: metadata,
      });

      this.logger.log(`Updated metadata for document ${id}`);
    } catch (error) {
      this.logger.error(`Error updating metadata for document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get documents by IDs
   */
  async getDocuments(
    ids: string[],
    namespace?: string,
  ): Promise<SearchResult[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      const response = await index.namespace(namespace || '').fetch(ids);

      return Object.entries(response.vectors).map(([id, vector]) => ({
        id,
        content: vector.metadata?.content || '',
        score: 1.0, // Fetch doesn't return similarity scores
        metadata: vector.metadata,
      }));
    } catch (error) {
      this.logger.error('Error fetching documents:', error);
      throw error;
    }
  }

  /**
   * List all namespaces
   */
  async listNamespaces(): Promise<string[]> {
    try {
      const stats = await this.getStats();
      return stats.namespaces;
    } catch (error) {
      this.logger.error('Error listing namespaces:', error);
      throw error;
    }
  }

  /**
   * Health check for Pinecone service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const stats = await this.getStats();
      return {
        status: 'healthy',
        details: {
          indexName: stats.indexName,
          totalVectors: stats.totalVectors,
          namespaces: stats.namespaces,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }
}
