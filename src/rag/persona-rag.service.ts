import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { LlmService } from '../llm/llm.service';
import { AiPersonasService } from '../ai-personas/ai-personas.service';
import { SystemMessage } from '@langchain/core/messages';
import { DocumentProcessor } from './utils/document-processor.util';
import { PersonaEmbeddingsManager } from './utils/persona-embeddings-manager.util';
import {
  DocumentMetadata,
  DocumentProcessingOptions,
  ProcessedDocument,
  RAGResponse,
  SearchOptions,
  SearchResult,
} from './interfaces/rag.interface';
import { PersonaType } from '../ai-personas/interfaces';

@Injectable()
export class PersonaRagService {
  private readonly logger = new Logger(PersonaRagService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmService: LlmService,
    private readonly aiPersonasService: AiPersonasService,
    private readonly documentProcessor: DocumentProcessor,
    private readonly personaEmbeddingsManager: PersonaEmbeddingsManager,
  ) {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Add a single document to a persona-specific knowledge base
   */
  async addDocumentToPersona(
    content: string,
    personaType: PersonaType,
    metadata: Partial<DocumentMetadata> = {},
    options: DocumentProcessingOptions = {},
  ): Promise<string[]> {
    this.logger.log(`Adding document to ${personaType} knowledge base`);

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

    // Store documents with embeddings in persona-specific table
    const documentIds = await this.personaEmbeddingsManager.storeDocuments(
      processedDocs,
      personaType,
    );

    this.logger.log(
      `Added ${documentIds.length} document chunks to ${personaType} database`,
    );
    return documentIds;
  }

  /**
   * Add multiple documents efficiently to a persona-specific knowledge base
   */
  async addDocumentsToPersona(
    personaType: PersonaType,
    documents: Array<{
      content: string;
      metadata?: Partial<DocumentMetadata>;
      options?: DocumentProcessingOptions;
    }>,
  ): Promise<string[]> {
    this.logger.log(
      `Adding ${documents.length} documents to ${personaType} knowledge base`,
    );

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

    // Store all documents in persona-specific table
    const documentIds = await this.personaEmbeddingsManager.storeDocuments(
      allProcessedDocs,
      personaType,
    );

    this.logger.log(
      `Added ${documentIds.length} total document chunks to ${personaType} database`,
    );
    return documentIds;
  }

  /**
   * Search for similar documents in a persona-specific database
   */
  async searchSimilarDocuments(
    query: string,
    personaType: PersonaType,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    this.logger.log(`Searching in ${personaType} database for: "${query}"`);

    const results = await this.personaEmbeddingsManager.searchSimilarDocuments(
      query,
      personaType,
      options,
    );

    this.logger.log(
      `Found ${results.length} similar documents in ${personaType} database`,
    );
    return results;
  }

  /**
   * Generate RAG response using persona-specific knowledge base
   */
  async generatePersonaRAGResponse(
    query: string,
    personaType: PersonaType,
    searchOptions: SearchOptions = {},
  ): Promise<RAGResponse> {
    try {
      this.logger.log(
        `Generating RAG response for ${personaType} with query: "${query}"`,
      );

      // Search for relevant documents in persona-specific database
      const searchResults = await this.searchSimilarDocuments(
        query,
        personaType,
        {
          ...searchOptions,
          limit: searchOptions.limit || 5,
        },
      );

      if (searchResults.length === 0) {
        this.logger.warn(
          `No relevant documents found in ${personaType} database`,
        );
        return {
          answer: `I don't have enough information in my knowledge base to answer your question. Please add more documents to my ${personaType} database.`,
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
      let systemPrompt = `You are a helpful assistant that answers questions based on the provided context from your knowledge base. 
      Always cite your sources using [Source X] notation when referencing information from the context.
      If the context doesn't contain enough information to answer the question, say so clearly.`;

      const personaSystemPrompt =
        this.aiPersonasService.getSystemPrompt(personaType);
      systemPrompt = `${personaSystemPrompt}\n\n${systemPrompt}`;

      const response = await this.llmService.chatWithOpenAI(
        `Context:\n${context}\n\nQuestion: ${query}`,
        new SystemMessage(systemPrompt),
      );

      // Calculate overall confidence based on similarity scores
      const avgSimilarity =
        searchResults.reduce((sum, result) => sum + result.similarity, 0) /
        searchResults.length;
      const confidence = Math.min(avgSimilarity * 1.2, 1.0); // Boost confidence slightly

      this.logger.log(
        `Generated ${personaType} RAG response with confidence: ${confidence}`,
      );

      return {
        answer: response,
        sources: searchResults,
        confidence,
        usedContext: context,
      };
    } catch (error) {
      this.logger.error(`Error generating ${personaType} RAG response:`, error);
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to generate ${personaType} RAG response: ${errMsg}`,
      );
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
   * Delete document from persona-specific database
   */
  async deleteDocument(
    documentId: string,
    personaType: PersonaType,
  ): Promise<void> {
    await this.personaEmbeddingsManager.deleteDocument(documentId, personaType);
    this.logger.log(
      `Document ${documentId} deleted from ${personaType} database`,
    );
  }

  /**
   * Update document metadata in persona-specific database
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: Partial<DocumentMetadata>,
    personaType: PersonaType,
  ): Promise<void> {
    await this.personaEmbeddingsManager.updateDocumentMetadata(
      documentId,
      metadata,
      personaType,
    );
    this.logger.log(
      `Document ${documentId} metadata updated in ${personaType} database`,
    );
  }

  /**
   * Get document statistics for a specific persona
   */
  async getPersonaDocumentStats(personaType: PersonaType) {
    const stats =
      await this.personaEmbeddingsManager.getPersonaDocumentStats(personaType);
    this.logger.log(`Retrieved stats for ${personaType} database`);
    return stats;
  }

  /**
   * Get document statistics for all personas
   */
  async getAllPersonasStats() {
    const stats = await this.personaEmbeddingsManager.getAllPersonasStats();
    this.logger.log('Retrieved stats for all persona databases');
    return stats;
  }

  /**
   * Clear all documents from a persona-specific database
   */
  async clearPersonaDocuments(personaType: PersonaType): Promise<number> {
    const deletedCount =
      await this.personaEmbeddingsManager.clearPersonaDocuments(personaType);
    this.logger.log(
      `Cleared ${deletedCount} documents from ${personaType} database`,
    );
    return deletedCount;
  }

  /**
   * Debug method to get raw documents and check embeddings for a persona
   */
  async debugGetPersonaDocuments(personaType: PersonaType) {
    const result =
      await this.personaEmbeddingsManager.debugGetPersonaDocuments(personaType);
    this.logger.log(`Retrieved debug document info for ${personaType}`);
    return result;
  }

  /**
   * Check if a persona database has documents
   */
  async hasPersonaDocuments(personaType: PersonaType): Promise<boolean> {
    const stats = await this.getPersonaDocumentStats(personaType);
    return stats.totalDocuments > 0;
  }

  /**
   * Get available personas with their document counts
   */
  async getAvailablePersonas(): Promise<
    Array<{
      personaType: PersonaType;
      displayName: string;
      totalDocuments: number;
      hasDocuments: boolean;
    }>
  > {
    const allStats = await this.getAllPersonasStats();

    return Object.entries(allStats).map(([personaType, stats]) => ({
      personaType: personaType as PersonaType,
      displayName: this.getPersonaDisplayName(personaType as PersonaType),
      totalDocuments: stats.totalDocuments,
      hasDocuments: stats.totalDocuments > 0,
    }));
  }

  /**
   * Get persona display name
   */
  private getPersonaDisplayName(personaType: PersonaType): string {
    const config = {
      PRIYA: 'AI Girlfriend (Priya)',
      THERAPIST: 'AI Therapist',
      DIETICIAN: 'AI Dietician',
      CAREER: 'AI Career Counselor',
    };
    return config[personaType];
  }
}
