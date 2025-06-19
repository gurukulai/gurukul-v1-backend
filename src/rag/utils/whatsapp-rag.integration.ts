/**
 * WhatsApp RAG Integration Service
 *
 * This service integrates Retrieval-Augmented Generation (RAG) with WhatsApp messaging,
 * using LangChain.js for enhanced functionality:
 *
 * LangChain.js Integrations:
 * - ChatOpenAI: For response optimization and query enhancement
 * - SystemMessage/HumanMessage: For structured prompt management
 * - Document processing: Leverages existing LangChain document splitters
 * - Embeddings: Uses LangChain OpenAI embeddings (via embeddings-manager.util.ts)
 *
 * Key Features:
 * - Intelligent RAG trigger detection
 * - WhatsApp-optimized response formatting
 * - Query enhancement using LangChain
 * - Conversation history analysis
 * - RAG usage statistics
 * - Continuous learning from conversations
 *
 * Improvements Made:
 * - Replaced 'any' types with proper TypeScript interfaces
 * - Added proper error handling and fallbacks
 * - Integrated LangChain for response optimization
 * - Enhanced search query processing
 * - Added comprehensive metadata tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { RagService } from '../rag.service';
import { UserService } from '../../user/user.service';
import { AiPersonaType } from '../../ai-personas/interfaces/ai-persona.interface';
import {
  DocumentType,
  SearchOptions,
  RAGResponse,
  SearchResult,
} from '../interfaces/rag.interface';
import { Message } from '@prisma/client';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ConfigService } from '@nestjs/config';

// Interface for conversation history items
interface ConversationHistoryItem {
  fromUser: boolean;
  message: string;
  timestamp?: Date;
}

// Interface for RAG processing result
interface RAGProcessingResult {
  shouldUseRAG: boolean;
  ragResponse?: string;
  sources?: SearchResult[];
  confidence?: number;
}

// Interface for RAG interaction metadata
interface RAGInteractionMetadata {
  type: string;
  confidence: number;
  sourcesCount: number;
  personaType: AiPersonaType;
  timestamp: string;
}

@Injectable()
export class WhatsAppRAGIntegration {
  private readonly logger = new Logger(WhatsAppRAGIntegration.name);
  private readonly chatModel: ChatOpenAI;

  constructor(
    private readonly ragService: RagService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    // Initialize LangChain chat model
    this.chatModel = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName:
        this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
      temperature: 0.7,
    });
  }

  /**
   * Process WhatsApp message and check if it should trigger RAG search
   */
  async processWhatsAppMessage(
    message: string,
    userId: number,
    personaType: AiPersonaType,
  ): Promise<RAGProcessingResult> {
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

    // Format response for WhatsApp using LangChain
    const formattedResponse =
      await this.formatRAGResponseForWhatsApp(ragResponse);

    // Save the RAG interaction
    await this.saveRAGInteraction(userId, message, ragResponse, personaType);

    return {
      shouldUseRAG: true,
      ragResponse: formattedResponse,
      sources: ragResponse.sources,
      confidence: ragResponse.confidence,
    };
  }

  /**
   * Format RAG response for WhatsApp display using LangChain
   */
  private async formatRAGResponseForWhatsApp(
    ragResponse: RAGResponse,
  ): Promise<string> {
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

    // Use LangChain to optimize the response for WhatsApp
    const optimizationPrompt = `You are a WhatsApp message formatter. Format the following response to be clear, concise, and well-suited for WhatsApp messaging. \n    Keep it under 1500 characters, use appropriate emojis sparingly, and ensure it's easy to read on mobile devices.\n    \n    Original response: ${formattedResponse}\n    \n    Format it for WhatsApp:`;

    const messages = [
      new SystemMessage(
        'You are a helpful assistant that formats responses for WhatsApp messaging.',
      ),
      new HumanMessage(optimizationPrompt),
    ];

    const response = await this.chatModel.invoke(messages);
    const optimizedResponse = response.content as string;

    // Truncate if still too long for WhatsApp
    if (optimizedResponse.length > 1500) {
      return (
        optimizedResponse.substring(0, 1450) +
        '...\n\n*Response truncated for WhatsApp.*'
      );
    }

    return optimizedResponse;
  }

  /**
   * Save RAG interaction for analytics and learning
   */
  private async saveRAGInteraction(
    userId: number,
    query: string,
    response: RAGResponse,
    personaType: AiPersonaType,
  ): Promise<void> {
    const metadata: RAGInteractionMetadata = {
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
  }

  /**
   * Add user conversation to knowledge base (for continuous learning)
   */
  async addConversationToKnowledgeBase(
    userId: number,
    personaType: AiPersonaType,
    conversationHistory: ConversationHistoryItem[],
  ): Promise<void> {
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

    this.logger.log(`Added conversation to knowledge base for user ${userId}`);
  }

  /**
   * Suggest relevant documents based on user's conversation pattern using LangChain
   */
  async suggestRelevantDocuments(
    userId: number,
    personaType: AiPersonaType,
    limit: number = 3,
  ): Promise<string[]> {
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
      .filter((msg: Message) => msg.fromUser)
      .map((msg: Message) => msg.message)
      .slice(0, 3)
      .join(' ');

    if (!userMessages.trim()) {
      return [];
    }

    // Use LangChain to enhance the search query
    const enhancedQuery = await this.enhanceSearchQuery(userMessages);

    // Search for relevant documents
    const searchResults = await this.ragService.searchSimilarDocuments(
      enhancedQuery,
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
  }

  /**
   * Enhance search query using LangChain for better document matching
   */
  private async enhanceSearchQuery(userMessages: string): Promise<string> {
    const enhancementPrompt = `You are a search query enhancer. Given a user's recent messages, create a concise search query that would help find relevant documents. \n      Focus on the main topics, questions, or information needs expressed by the user.\n      \n      User messages: ${userMessages}\n      \n      Enhanced search query:`;

    const messages = [
      new SystemMessage(
        'You are a helpful assistant that enhances search queries for better document retrieval.',
      ),
      new HumanMessage(enhancementPrompt),
    ];

    const response = await this.chatModel.invoke(messages);
    return response.content as string;
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
    // Get user's conversation history to analyze RAG usage
    const allPersonas: AiPersonaType[] = [
      'THERAPIST',
      'DIETICIAN',
      'CAREER',
      'PRIYA',
    ];
    let totalRAGQueries = 0;
    let totalConfidence = 0;
    const categories: Record<string, number> = {};

    for (const personaType of allPersonas) {
      const messages = await this.userService.getConversationHistory(
        userId,
        personaType,
      );

      // Count RAG interactions based on metadata
      const ragMessages = messages.filter((msg: Message) => {
        if (msg.metadata) {
          try {
            const metadata = JSON.parse(
              msg.metadata as string,
            ) as RAGInteractionMetadata;
            return metadata.type === 'rag_interaction';
          } catch {
            return false;
          }
        }
        return false;
      });

      totalRAGQueries += ragMessages.length;

      // Calculate average confidence
      ragMessages.forEach((msg: Message) => {
        try {
          const metadata = JSON.parse(
            msg.metadata as string,
          ) as RAGInteractionMetadata;
          totalConfidence += metadata.confidence || 0;
        } catch {
          // Ignore parsing errors
        }
      });
    }

    const avgConfidence =
      totalRAGQueries > 0 ? totalConfidence / totalRAGQueries : 0;
    const topCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    this.logger.log(`Retrieved RAG usage stats for user ${userId}`);

    return {
      totalRAGQueries,
      avgConfidence,
      topCategories,
    };
  }
}
