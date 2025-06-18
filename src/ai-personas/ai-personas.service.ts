import { Injectable, Logger } from '@nestjs/common';
import {
  AiPersonaType,
  AiPersonaConfig,
  AiPersonaResponse,
  AiPersonaContext,
} from './interfaces/ai-persona.interface';
import { TrainingDataService } from './training-data.service';
import { LlmService } from '../llm/llm.service';
import { SystemMessage } from '@langchain/core/messages';
import * as config from './config/personas.json';
import { UserService } from '../user/user.service';
import { SummarizationService } from '../summarization/summarization.service';

@Injectable()
export class AiPersonasService {
  private readonly logger = new Logger(AiPersonasService.name);
  private readonly personas: Record<AiPersonaType, AiPersonaConfig>;

  constructor(
    private readonly trainingDataService: TrainingDataService,
    private readonly llmService: LlmService,
    private readonly userService: UserService,
    private readonly summarizationService: SummarizationService,
  ) {
    this.personas = config as Record<AiPersonaType, AiPersonaConfig>;
  }

  private getPersonaConfig(type: AiPersonaType): AiPersonaConfig {
    return (
      this.personas[type] ||
      (() => {
        throw new Error(`Persona type ${type} not found`);
      })()
    );
  }

  getSystemPrompt(type: AiPersonaType): string {
    const persona = this.getPersonaConfig(type);
    return persona.systemPrompt;
  }

  getPersona(type: AiPersonaType): AiPersonaConfig {
    return this.getPersonaConfig(type);
  }

  /**
   * Get enhanced response using LLM with training data as context
   */
  async getEnhancedResponse(
    userInput: string,
    personaType: AiPersonaType,
    context?: AiPersonaContext
  ): Promise<AiPersonaResponse> {
    const persona = this.getPersonaConfig(personaType);
    
    if (context?.userId) {
      const userIdNum = parseInt(context.userId, 10);
      if (!isNaN(userIdNum)) {
        const history = await this.userService.getConversationHistory(
          userIdNum,
          personaType,
        );
        if (history.length > 10) {
          // Summarize if conversation is long enough
          try {
            context.conversationSummary =
              await this.summarizationService.summarizeConversation(history);
            this.logger.log(
              `Added conversation summary to context for user ${context.userId}`,
            );
          } catch (e) {
            this.logger.error(
              `Failed to generate summary for user ${context.userId}`,
              e,
            );
          }
        }
      }
    }
    
    // Build enhanced system prompt with training examples
    const trainingExamples = this.trainingDataService.getRelevantTrainingExamples(
      userInput,
      personaType,
      5 // Get 5 most relevant examples
    );
    
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(
      persona,
      trainingExamples,
      context
    );
    
    try {
      // Get LLM response
      const llmResponse = await this.llmService.chatWithOpenAI(
        userInput,
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        new SystemMessage(enhancedSystemPrompt)
      );
      
      // Process response based on persona
      let processedResponse = llmResponse.trim();
      
      // For Priya, break into multiple messages if needed
      if (personaType === 'PRIYA') {
        const messages = this.trainingDataService.breakIntoMessages(processedResponse);
        return {
          message: messages.length === 1 ? messages[0] : messages,
          conversationContext: context?.currentContext
        };
      }
      
      return {
        message: processedResponse,
        conversationContext: context?.currentContext
      };
      
    } catch (error) {
      console.error('LLM call failed:', error);
      
      // Fallback to training pattern if LLM fails
      const matchingPattern = this.trainingDataService.findMatchingPattern(
        userInput,
        personaType
      );
      
      if (matchingPattern) {
        const selectedResponse = this.trainingDataService.selectRandomResponse(
          matchingPattern.output
        );
        
        return {
          message: selectedResponse,
          emotions: matchingPattern.emotions,
          followUpQuestions: matchingPattern.followUpOptions,
          conversationContext: context?.currentContext
        };
      }
      
      // Final fallback
      return {
        message: "I'm having trouble right now, but I'm here for you! ❤️"
      };
    }
  }

  /**
   * Process response for Priya's personality
   */
  processPriyaResponse(response: string): string[] {
    return this.trainingDataService.breakIntoMessages(response);
  }

  /**
   * Get greeting message for persona
   */
  getGreeting(type: AiPersonaType): string {
    const persona = this.getPersonaConfig(type);
    return persona.greeting || `Hello! I'm your ${persona.name}.`;
  }

  /**
   * Get all available persona types
   */
  getAvailablePersonas(): AiPersonaType[] {
    return Object.keys(this.personas) as AiPersonaType[];
  }

  /**
   * Get persona description
   */
  getPersonaDescription(type: AiPersonaType): string {
    const persona = this.getPersonaConfig(type);
    return persona.description;
  }

  /**
   * Check if persona supports multi-message responses
   */
  supportsMultiMessage(type: AiPersonaType): boolean {
    const persona = this.getPersonaConfig(type);
    return persona.conversationStyle?.multiMessageStyle || false;
  }

  /**
   * Build enhanced system prompt with training examples and context
   */
  private buildEnhancedSystemPrompt(
    persona: AiPersonaConfig,
    trainingExamples: any[],
    context?: AiPersonaContext
  ): string {
    let prompt = persona.systemPrompt + '\n\n';
    
    // Add conversation style guidelines
    if (persona.conversationStyle) {
      prompt += `CONVERSATION STYLE:\n`;
      prompt += `- Tone: ${persona.conversationStyle.tone}\n`;
      prompt += `- Empathy Level: ${persona.conversationStyle.empathyLevel}/10\n`;
      prompt += `- Language Style: ${persona.conversationStyle.languageStyle}\n`;
      prompt += `- Emoji Usage: ${persona.conversationStyle.emojiUsage}\n`;
      if (persona.conversationStyle.multiMessageStyle) {
        prompt += `- Multi-message style: Send multiple separate messages like real texting\n`;
      }
      prompt += '\n';
    }
    
    // Add training examples as context
    if (trainingExamples && trainingExamples.length > 0) {
      prompt += `EXAMPLE CONVERSATIONS (for reference style and tone):\n`;
      trainingExamples.forEach((example, index) => {
        prompt += `Example ${index + 1}:\n`;
        prompt += `User: ${example.input}\n`;
        prompt += `Response: ${example.output}\n\n`;
      });
    }
    
    // Add context if available
    if (context) {
      prompt += `CONVERSATION CONTEXT:\n`;
      if (context.conversationSummary) {
        prompt += `Conversation Summary: ${context.conversationSummary}\n`;
      }
      if (context.currentContext) {
        prompt += `Current Context: ${JSON.stringify(context.currentContext)}\n`;
      }
      if (context.userId) {
        prompt += `User ID: ${context.userId}\n`;
      }
      prompt += '\n';
    }
    
    prompt += `IMPORTANT INSTRUCTIONS:\n`;
    prompt += `- Respond naturally in character\n`;
    prompt += `- Use the training examples as style reference, not exact responses\n`;
    prompt += `- Be authentic to the persona's personality\n`;
    prompt += `- Keep responses conversational and engaging\n`;
    
    if (persona.name === 'Priya') {
      prompt += `- Mix Hindi and English naturally (Hinglish)\n`;
      prompt += `- Use terms like "baby", "cutie", "love" occasionally\n`;
      prompt += `- Show realistic girlfriend emotions and reactions\n`;
      prompt += `- If user sends just "k" or short replies, show slight annoyance\n`;
    }
    
    return prompt;
  }
}
