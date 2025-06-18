import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { LlmService } from '../llm/llm.service';
import { AiPersonasService } from '../ai-personas/ai-personas.service';
import { SystemMessage } from '@langchain/core/messages';
import { DocumentProcessor } from './utils/document-processor.util';
import { EmbeddingsManager } from './utils/embeddings-manager.util';
import {
  DocumentMetadata,
  DocumentProcessingOptions,
  ProcessedDocument,
  RAGResponse,
  SearchOptions,
  SearchResult,
} from './interfaces/rag.interface';
import { AiPersonaType } from '../ai-personas/interfaces/ai-persona.interface';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmService: LlmService,
    private readonly aiPersonasService: AiPersonasService,
    private readonly documentProcessor: DocumentProcessor,
    private readonly embeddingsManager: EmbeddingsManager,
  ) {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Add a single document to the knowledge base
   */
  async addDocument(
    content: string,
    metadata: Partial<DocumentMetadata> = {},
    options: DocumentProcessingOptions = {},
  ): Promise<string[]> {
    this.logger.log('Adding document to knowledge base');

    // Process document into chunks
    const chunks = await this.documentProcessor.processDocument(
      content,
      metadata,
      options,
    );

    // Convert chunks to processed documents
    const processedDocs: ProcessedDocument[] = chunks.map((chunk) => ({
      content: chunk.content,
      metadata: chunk.metadata,
    }));

    // Store documents with embeddings
    const documentIds =
      await this.embeddingsManager.storeDocuments(processedDocs);

    this.logger.log(`Added ${String(documentIds.length)} document chunks`);
    return documentIds;
  }

  /**
   * Add multiple documents efficiently
   */
  async addDocuments(
    documents: Array<{
      content: string;
      metadata?: Partial<DocumentMetadata>;
      options?: DocumentProcessingOptions;
    }>,
  ): Promise<string[]> {
    this.logger.log(`Adding ${documents.length} documents to knowledge base`);

    const allProcessedDocs: ProcessedDocument[] = [];

    // Process all documents
    for (const doc of documents) {
      const chunks = await this.documentProcessor.processDocument(
        doc.content,
        doc.metadata || {},
        doc.options || {},
      );

      const processedDocs: ProcessedDocument[] = chunks.map((chunk) => ({
        content: chunk.content,
        metadata: chunk.metadata,
      }));

      allProcessedDocs.push(...processedDocs);
    }

    // Store all documents
    const documentIds =
      await this.embeddingsManager.storeDocuments(allProcessedDocs);

    this.logger.log(
      `Added ${String(documentIds.length)} total document chunks`,
    );
    return documentIds;
  }

  /**
   * Search for similar documents
   */
  async searchSimilarDocuments(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    this.logger.log(`Searching for: "${query}"`);

    const results = await this.embeddingsManager.searchSimilarDocuments(
      query,
      options,
    );

    this.logger.log(`Found ${results.length} similar documents`);
    return results;
  }

  /**
   * Generate RAG response using retrieved context and persona
   */
  async generateRAGResponse(
    query: string,
    personaType?: AiPersonaType,
    searchOptions: SearchOptions = {},
  ): Promise<RAGResponse> {
    try {
      this.logger.log(`Generating RAG response for query: "${query}"`);

      // Search for relevant documents
      const searchResults = await this.searchSimilarDocuments(query, {
        ...searchOptions,
        personaType,
        limit: searchOptions.limit || 5,
      });

      if (searchResults.length === 0) {
        this.logger.warn('No relevant documents found');
        return {
          answer:
            "I don't have enough information to answer your question based on the available documents.",
          sources: [],
          confidence: 0,
          usedContext: '',
        };
      }

      // Prepare context from search results
      const context = searchResults
        .map(
          (result, index) =>
            `[Source ${index + 1}]: ${result.document.content}`,
        )
        .join('\n\n');

      // Generate response using LLM with persona
      let systemPrompt = `You are a helpful assistant that answers questions based on the provided context. 
      Always cite your sources using [Source X] notation when referencing information from the context.
      If the context doesn't contain enough information to answer the question, say so clearly.`;

      if (personaType) {
        const personaSystemPrompt =
          this.aiPersonasService.getSystemPrompt(personaType);
        systemPrompt = `${personaSystemPrompt}\n\n${systemPrompt}`;
      }

      const response = await this.llmService.chatWithOpenAI(
        `Context:\n${context}\n\nQuestion: ${query}`,
        this.configService.get<string>('OPENAI_API_KEY'),
        this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
        new SystemMessage(systemPrompt),
      );

      // Calculate overall confidence based on similarity scores
      const avgSimilarity =
        searchResults.reduce((sum, result) => sum + result.similarity, 0) /
        searchResults.length;
      const confidence = Math.min(avgSimilarity * 1.2, 1.0); // Boost confidence slightly

      this.logger.log(`Generated RAG response with confidence: ${confidence}`);

      return {
        answer: response,
        sources: searchResults,
        confidence,
        usedContext: context,
      };
    } catch (error) {
      this.logger.error('Error generating RAG response:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate RAG response: ${errMsg}`);
    }
  }

  /**
   * Generate simple response without persona (legacy compatibility)
   */
  async generateResponse(query: string, context: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model:
          this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that answers questions based on the provided context.',
          },
          {
            role: 'user',
            content: `Context: ${context}\n\nQuestion: ${query}`,
          },
        ],
      });

      return completion.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      this.logger.error('Error generating response:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate response: ${errMsg}`);
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.embeddingsManager.deleteDocument(documentId);
    this.logger.log(`Document ${documentId} deleted`);
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: Partial<DocumentMetadata>,
  ): Promise<void> {
    await this.embeddingsManager.updateDocumentMetadata(documentId, metadata);
    this.logger.log(`Document ${documentId} metadata updated`);
  }

  /**
   * Get document statistics
   */
  async getDocumentStats() {
    const stats = await this.embeddingsManager.getDocumentStats();
    this.logger.log('Retrieved document statistics');
    return stats;
  }

  /**
   * Debug method to get raw documents and check embeddings
   */
  async debugGetDocuments() {
    const result = await this.embeddingsManager.debugGetDocuments();
    this.logger.log('Retrieved debug document info');
    return result;
  }
}
