import { Injectable, Logger } from '@nestjs/common';
import { RagService } from '../rag.service';
import { UserService } from '../../user/user.service';
import { AiPersonaType } from '../../ai-personas/interfaces/ai-persona.interface';
import { DocumentType, SearchOptions } from '../interfaces/rag.interface';

@Injectable()
export class WhatsAppRAGIntegration {
  private readonly logger = new Logger(WhatsAppRAGIntegration.name);

  constructor(
    private readonly ragService: RagService,
    private readonly userService: UserService,
  ) {}

  /**
   * Process WhatsApp message and check if it should trigger RAG search
   */
  async processWhatsAppMessage(
    message: string,
    userId: number,
    personaType: AiPersonaType,
  ): Promise<{
    shouldUseRAG: boolean;
    ragResponse?: string;
    sources?: any[];
    confidence?: number;
  }> {
    try {
      // Check if message indicates user wants document-based information
      const ragTriggers = [
        'search',
        'find',
        'lookup',
        'document',
        'file',
        'information about',
        'tell me about',
        'what is',
        'explain',
        'define',
        'help with',
        'do you know',
        'can you find',
        'show me',
      ];

      const shouldUseRAG = ragTriggers.some((trigger) =>
        message.toLowerCase().includes(trigger.toLowerCase()),
      );

      if (!shouldUseRAG) {
        return { shouldUseRAG: false };
      }

      this.logger.log(`Processing RAG query for user ${userId}: "${message}"`);

      // Configure search options based on persona
      const searchOptions: SearchOptions = {
        limit: 3, // Limit results for WhatsApp context
        threshold: 0.7,
        personaType,
        includeMetadata: true,
      };

      // Generate RAG response
      const ragResponse = await this.ragService.generateRAGResponse(
        message,
        personaType,
        searchOptions,
      );

      // Format response for WhatsApp
      const formattedResponse = this.formatRAGResponseForWhatsApp(ragResponse);

      // Save the RAG interaction
      await this.saveRAGInteraction(userId, message, ragResponse, personaType);

      return {
        shouldUseRAG: true,
        ragResponse: formattedResponse,
        sources: ragResponse.sources,
        confidence: ragResponse.confidence,
      };
    } catch (error) {
      this.logger.error('Error processing WhatsApp RAG message:', error);
      return {
        shouldUseRAG: true,
        ragResponse:
          'I encountered an error while searching for information. Please try rephrasing your question.',
      };
    }
  }

  /**
   * Format RAG response for WhatsApp display
   */
  private formatRAGResponseForWhatsApp(ragResponse: any): string {
    let formattedResponse = ragResponse.answer;

    // Add confidence indicator if low
    if (ragResponse.confidence < 0.6) {
      formattedResponse +=
        "\n\n⚠️ *Note: I found some potentially relevant information, but I'm not entirely confident about this answer.*";
    }

    // Add source count if available
    if (ragResponse.sources && ragResponse.sources.length > 0) {
      formattedResponse += `\n\n📚 *Based on ${ragResponse.sources.length} document(s) in my knowledge base.*`;
    }

    // Truncate if too long for WhatsApp
    if (formattedResponse.length > 1500) {
      formattedResponse =
        formattedResponse.substring(0, 1450) +
        '...\n\n*Response truncated for WhatsApp.*';
    }

    return formattedResponse;
  }

  /**
   * Save RAG interaction for analytics and learning
   */
  private async saveRAGInteraction(
    userId: number,
    query: string,
    response: any,
    personaType: AiPersonaType,
  ): Promise<void> {
    try {
      const metadata = {
        type: 'rag_interaction',
        confidence: response.confidence,
        sourcesCount: response.sources?.length || 0,
        personaType,
        timestamp: new Date().toISOString(),
      };

      // Save user query
      await this.userService.saveConversation(
        userId,
        personaType,
        query,
        true,
        metadata,
      );

      // Save RAG response
      await this.userService.saveConversation(
        userId,
        personaType,
        response.answer,
        false,
        metadata,
      );

      this.logger.log(`Saved RAG interaction for user ${userId}`);
    } catch (error) {
      this.logger.error('Error saving RAG interaction:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Add user conversation to knowledge base (for continuous learning)
   */
  async addConversationToKnowledgeBase(
    userId: number,
    personaType: AiPersonaType,
    conversationHistory: any[],
  ): Promise<void> {
    try {
      // Filter for meaningful conversations (more than 2 exchanges)
      if (conversationHistory.length < 4) {
        return;
      }

      // Create conversation document
      const conversationText = conversationHistory
        .map((msg) => `${msg.fromUser ? 'User' : 'AI'}: ${msg.message}`)
        .join('\n');

      const metadata = {
        documentType: DocumentType.CONVERSATION,
        personaType,
        category: 'user_conversations',
        userId: userId.toString(),
        createdAt: new Date(),
        tags: ['conversation', personaType.toLowerCase()],
      };

      // Add to knowledge base
      await this.ragService.addDocument(conversationText, metadata, {
        chunkSize: 800,
        chunkOverlap: 100,
        customSplitter: 'paragraph',
      });

      this.logger.log(
        `Added conversation to knowledge base for user ${userId}`,
      );
    } catch (error) {
      this.logger.error('Error adding conversation to knowledge base:', error);
    }
  }

  /**
   * Suggest relevant documents based on user's conversation pattern
   */
  async suggestRelevantDocuments(
    userId: number,
    personaType: AiPersonaType,
    limit: number = 3,
  ): Promise<string[]> {
    try {
      // Get recent user messages
      const recentMessages = await this.userService.getLatestMessages(
        userId,
        personaType,
        10,
      );

      if (recentMessages.length === 0) {
        return [];
      }

      // Create search query from recent messages
      const userMessages = recentMessages
        .filter((msg) => msg.fromUser)
        .map((msg) => msg.message)
        .slice(0, 3)
        .join(' ');

      if (!userMessages.trim()) {
        return [];
      }

      // Search for relevant documents
      const searchResults = await this.ragService.searchSimilarDocuments(
        userMessages,
        {
          limit,
          threshold: 0.6,
          personaType,
          includeMetadata: true,
        },
      );

      // Extract document titles or summaries
      const suggestions = searchResults.map((result) => {
        const title =
          result.document.metadata.title ||
          result.document.content.substring(0, 50) + '...';
        return `📄 ${title}`;
      });

      return suggestions;
    } catch (error) {
      this.logger.error('Error suggesting documents:', error);
      return [];
    }
  }

  /**
   * Check if user's query might be better served by RAG
   */
  isRAGCandidate(message: string): boolean {
    const ragIndicators = [
      // Question words
      /^(what|how|why|when|where|who|which)\s/i,
      // Information seeking
      /(tell me|explain|describe|define)/i,
      // Search intent
      /(find|search|look for|lookup)/i,
      // Knowledge queries
      /(do you know|can you|help me understand)/i,
      // Specific topics (can be customized per persona)
      /(steps|process|guide|tutorial|information)/i,
    ];

    return ragIndicators.some((pattern) => pattern.test(message));
  }

  /**
   * Get RAG usage statistics for a user
   */
  async getRAGUsageStats(userId: number): Promise<{
    totalRAGQueries: number;
    avgConfidence: number;
    topCategories: string[];
  }> {
    try {
      // This would typically query the database for RAG-specific metrics
      // For now, we'll return a placeholder structure
      this.logger.log(`Getting RAG usage stats for user ${userId}`);
      return {
        totalRAGQueries: 0,
        avgConfidence: 0,
        topCategories: [],
      };
    } catch (error) {
      this.logger.error('Error getting RAG usage stats:', error);
      return {
        totalRAGQueries: 0,
        avgConfidence: 0,
        topCategories: [],
      };
    }
  }
}
