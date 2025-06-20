/**
 * LangChain.js Enhancement Utilities for RAG System
 *
 * This file provides additional LangChain.js integrations to enhance the RAG system:
 * - Memory management for conversation context
 * - Chain composition for complex workflows
 * - Output parsing for structured responses
 * - Vector store integrations
 * - Prompt templates for consistent formatting
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ConversationChain, LLMChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import { BufferMemory } from 'langchain/memory';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';

// Interface for enhanced RAG response
export interface EnhancedRAGResponse {
  answer: string;
  confidence: number;
  sources: Array<{
    content: string;
    similarity: number;
    metadata?: Record<string, any>;
  }>;
  followUpQuestions: string[];
  suggestedActions: string[];
  contextSummary: string;
}

// Interface for conversation memory
export interface ConversationMemory {
  userId: string;
  personaType: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  context: Record<string, any>;
}

@Injectable()
export class LangChainEnhancements {
  private readonly logger = new Logger(LangChainEnhancements.name);
  private readonly llm: ChatOpenAI;
  private readonly embeddings: OpenAIEmbeddings;
  private readonly conversationMemories: Map<string, BufferMemory> = new Map();
  private readonly vectorStore: MemoryVectorStore;

  constructor(private readonly configService: ConfigService) {
    this.llm = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName:
        this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
      temperature: 0.7,
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    this.vectorStore = new MemoryVectorStore(this.embeddings);
  }

  /**
   * Create a conversation chain with memory for persistent context
   */
  async createConversationChain(
    userId: string,
    personaType: string,
    systemPrompt: string,
  ): Promise<ConversationChain> {
    const memoryKey = `${userId}-${personaType}`;

    if (!this.conversationMemories.has(memoryKey)) {
      const memory = new BufferMemory({
        returnMessages: true,
        memoryKey: 'history',
        inputKey: 'input',
      });
      this.conversationMemories.set(memoryKey, memory);
    }

    const memory = this.conversationMemories.get(memoryKey)!;

    return new ConversationChain({
      llm: this.llm,
      memory,
      prompt: PromptTemplate.fromTemplate(`
        ${systemPrompt}
        
        Current conversation:
        {history}
        Human: {input}
        AI: `),
    });
  }

  /**
   * Generate follow-up questions using LangChain
   */
  async generateFollowUpQuestions(
    userQuery: string,
    ragResponse: string,
    context: string,
  ): Promise<string[]> {
    const followUpPrompt = PromptTemplate.fromTemplate(`
      Based on the user's question and the provided response, generate 3 relevant follow-up questions.
      The questions should be natural, helpful, and encourage further engagement.
      
      User Question: {userQuery}
      Response: {ragResponse}
      Context: {context}
      
      Generate 3 follow-up questions:
      1. 
      2. 
      3. 
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: followUpPrompt,
    });

    try {
      const result = await chain.invoke({
        userQuery,
        ragResponse,
        context,
      });

      // Parse the response to extract questions
      const response = result.text as string;
      const questions = response
        .split('\n')
        .filter((line) => line.match(/^\d+\./))
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((q) => q.length > 0)
        .slice(0, 3);

      return questions;
    } catch (error) {
      this.logger.error('Error generating follow-up questions:', error);
      return [];
    }
  }

  /**
   * Create a structured output parser for RAG responses
   */
  async createStructuredRAGResponse(
    query: string,
    sources: Array<{ content: string; similarity: number }>,
    personaType: string,
  ): Promise<EnhancedRAGResponse> {
    const structuredPrompt = PromptTemplate.fromTemplate(`
      You are a helpful AI assistant with persona: {personaType}.
      
      Based on the user's query and the provided sources, generate a comprehensive response.
      
      User Query: {query}
      
      Sources:
      {sources}
      
      Please provide a response in the following JSON format:
      {{
        "answer": "Your main response to the user's query",
        "confidence": 0.85,
        "contextSummary": "Brief summary of the context used",
        "followUpQuestions": ["Question 1", "Question 2", "Question 3"],
        "suggestedActions": ["Action 1", "Action 2"]
      }}
    `);

    const chain = RunnableSequence.from([
      structuredPrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    try {
      const sourcesText = sources
        .map((source, index) => `Source ${index + 1}: ${source.content}`)
        .join('\n\n');

      const result = await chain.invoke({
        query,
        sources: sourcesText,
        personaType,
      });

      // Parse JSON response
      const parsed = JSON.parse(result);

      return {
        answer: parsed.answer,
        confidence: parsed.confidence,
        sources: sources.map((s) => ({
          content: s.content,
          similarity: s.similarity,
        })),
        followUpQuestions: parsed.followUpQuestions || [],
        suggestedActions: parsed.suggestedActions || [],
        contextSummary: parsed.contextSummary || '',
      };
    } catch (error) {
      this.logger.error('Error creating structured RAG response:', error);

      // Fallback to simple response
      return {
        answer:
          'I found some information but encountered an error processing it.',
        confidence: 0.5,
        sources: sources.map((s) => ({
          content: s.content,
          similarity: s.similarity,
        })),
        followUpQuestions: [],
        suggestedActions: [],
        contextSummary: 'Error occurred during processing',
      };
    }
  }

  /**
   * Add documents to vector store for enhanced retrieval
   */
  async addDocumentsToVectorStore(
    documents: Array<{ content: string; metadata?: Record<string, any> }>,
  ): Promise<void> {
    try {
      const langchainDocs = documents.map(
        (doc) =>
          new Document({
            pageContent: doc.content,
            metadata: doc.metadata || {},
          }),
      );

      await this.vectorStore.addDocuments(langchainDocs);
      this.logger.log(`Added ${documents.length} documents to vector store`);
    } catch (error) {
      this.logger.error('Error adding documents to vector store:', error);
    }
  }

  /**
   * Search vector store for similar documents
   */
  async searchVectorStore(
    query: string,
    k: number = 5,
  ): Promise<
    Array<{
      content: string;
      similarity: number;
      metadata?: Record<string, any>;
    }>
  > {
    try {
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        k,
      );

      return results.map(([doc, score]) => ({
        content: doc.pageContent,
        similarity: score,
        metadata: doc.metadata,
      }));
    } catch (error) {
      this.logger.error('Error searching vector store:', error);
      return [];
    }
  }

  /**
   * Create a multi-step reasoning chain
   */
  async createReasoningChain(query: string, context: string): Promise<string> {
    const reasoningPrompt = PromptTemplate.fromTemplate(`
      You are an AI assistant that uses step-by-step reasoning to answer questions.
      
      Question: {query}
      Context: {context}
      
      Please follow these steps:
      1. Analyze the question and identify what information is needed
      2. Review the provided context for relevant information
      3. Synthesize the information to form a comprehensive answer
      4. Provide your final response
      
      Step-by-step reasoning:
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: reasoningPrompt,
    });

    try {
      const result = await chain.invoke({ query, context });
      return result.text as string;
    } catch (error) {
      this.logger.error('Error in reasoning chain:', error);
      return 'I encountered an error while processing your question.';
    }
  }

  /**
   * Generate conversation summary using LangChain
   */
  async generateConversationSummary(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const summaryPrompt = PromptTemplate.fromTemplate(`
      Please provide a concise summary of the following conversation.
      Focus on key points, decisions made, and important context for future interactions.
      
      Conversation:
      {conversation}
      
      Summary:
    `);

    const conversationText = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const chain = new LLMChain({
      llm: this.llm,
      prompt: summaryPrompt,
    });

    try {
      const result = await chain.invoke({ conversation: conversationText });
      return result.text as string;
    } catch (error) {
      this.logger.error('Error generating conversation summary:', error);
      return 'Unable to generate summary due to an error.';
    }
  }

  /**
   * Clean up conversation memory for a user
   */
  async clearConversationMemory(
    userId: string,
    personaType: string,
  ): Promise<void> {
    const memoryKey = `${userId}-${personaType}`;
    this.conversationMemories.delete(memoryKey);
    this.logger.log(`Cleared conversation memory for ${memoryKey}`);
  }

  /**
   * Get conversation memory for a user
   */
  async getConversationMemory(
    userId: string,
    personaType: string,
  ): Promise<ConversationMemory | null> {
    const memoryKey = `${userId}-${personaType}`;
    const memory = this.conversationMemories.get(memoryKey);

    if (!memory) {
      return null;
    }

    try {
      const history = await memory.loadMemoryVariables({});
      return {
        userId,
        personaType,
        messages: history.history || [],
        context: {},
      };
    } catch (error) {
      this.logger.error('Error loading conversation memory:', error);
      return null;
    }
  }
}
