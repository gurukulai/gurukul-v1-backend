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
import { ConversationFlowService } from './conversation-flow.service';

@Injectable()
export class AiPersonasService {
  private readonly logger = new Logger(AiPersonasService.name);
  private readonly personas: Record<AiPersonaType, AiPersonaConfig>;

  constructor(
    private readonly trainingDataService: TrainingDataService,
    private readonly llmService: LlmService,
    private readonly userService: UserService,
    private readonly summarizationService: SummarizationService,
    private readonly conversationFlowService: ConversationFlowService,
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
    
    let enhancedSystemPrompt = this.buildEnhancedSystemPrompt(
      persona,
      trainingExamples,
      context
    );
    
    // Build recent conversation history for better context
    let recentHistory: string[] = [];
    if (context?.userId) {
      const userIdNum = parseInt(context.userId, 10);
      if (!isNaN(userIdNum)) {
        const history = await this.userService.getConversationHistory(
          userIdNum,
          personaType,
        );
        // Get last 10 messages for immediate context
        recentHistory = history.slice(-10).map(msg => 
          `${msg.fromUser ? 'User' : 'Priya'}: ${msg.message}`
        );
      }
    }

    // Generate conversation flow strategy (only for Priya for now)
    if (personaType === 'PRIYA') {
      
      try {
        const strategy = await this.conversationFlowService.generateStrategy(
          recentHistory,
          'Priya is an 18-year-old South Delhi girl starting her first year of law school at DU. She loves shopping at Sarojini, brunching at Hauz Khas, and is passionate about debating clubs.'
        );
        if (strategy) {
          enhancedSystemPrompt += `\nCONVERSATION STRATEGY (auto-generated):\n${strategy}\n`;
        }
      } catch (e) {
        this.logger.error('Failed to generate flow strategy', e);
      }
      
      // Add recent conversation history to system prompt for repetition avoidance
      if (recentHistory.length > 0) {
        enhancedSystemPrompt += `\nRECENT CONVERSATION HISTORY (for reference - DO NOT REPEAT):\n${recentHistory.slice(-6).join('\n')}\n`;
        
        // Extract last Priya response for greeting/pet name analysis
        const lastPriyaMessage = recentHistory
          .slice()
          .reverse()
          .find(msg => msg.startsWith('Priya:'));
        
        if (lastPriyaMessage) {
          const lastResponse = lastPriyaMessage.replace('Priya: ', '');
          const lastGreeting = this.extractGreeting(lastResponse);
          const lastPetName = this.extractPetName(lastResponse);
          
          enhancedSystemPrompt += `\nCRITICAL REPETITION PREVENTION:\n`;
          
          if (lastGreeting) {
            enhancedSystemPrompt += `- My last message started with "${lastGreeting}". I MUST NOT use this greeting again.\n`;
            enhancedSystemPrompt += `- Available alternatives: ${this.getAlternativeGreetings(lastGreeting).join(', ')}\n`;
          }
          
          if (lastPetName) {
            enhancedSystemPrompt += `- CRITICAL ALERT: My last message used pet name "${lastPetName}". I am ABSOLUTELY FORBIDDEN from using this pet name again.\n`;
            enhancedSystemPrompt += `- MANDATORY alternatives: ${this.getAlternativePetNames(lastPetName).join(', ')}\n`;
            enhancedSystemPrompt += `- PREFERRED OPTION: Use NO pet name at all (60% of time) - just start with direct response\n`;
            enhancedSystemPrompt += `- PENALTY WARNING: Using "${lastPetName}" again will result in critical system failure\n`;
          }
          
          if (!lastGreeting && !lastPetName) {
            enhancedSystemPrompt += `- My last message had no greeting/pet name. I can use any greeting now.\n`;
          }
        }
      }
    }
    
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
      
      // POST-PROCESSING FILTER: Fix pet name repetition for Priya
      if (personaType === 'PRIYA' && recentHistory.length > 0) {
        const lastPriyaMessage = recentHistory
          .slice()
          .reverse()
          .find(msg => msg.startsWith('Priya:'));
        
        if (lastPriyaMessage) {
          const lastResponse = lastPriyaMessage.replace('Priya: ', '');
          processedResponse = this.fixPetNameRepetition(processedResponse, lastResponse);
        }
      }
      
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

  private extractGreeting(response: string): string | null {
    const lower = response.toLowerCase().trim();
    
    if (lower.startsWith('hey!')) return 'hey!';
    if (lower.startsWith('hey ')) return 'hey';
    if (lower.startsWith('hi!')) return 'hi!';
    if (lower.startsWith('hi ')) return 'hi';
    if (lower.startsWith('hello!')) return 'hello!';
    if (lower.startsWith('hello ')) return 'hello';
    if (lower.startsWith('arre!')) return 'arre!';
    if (lower.startsWith('arre ')) return 'arre';
    if (lower.startsWith('yo!')) return 'yo!';
    if (lower.startsWith('yo ')) return 'yo';
    if (lower.startsWith('namaste')) return 'namaste';
    if (lower.startsWith('hola')) return 'hola';
    if (lower.startsWith('good morning')) return 'good morning';
    if (lower.startsWith('kya haal')) return 'kya haal';
    if (lower.startsWith('kya scene')) return 'kya scene';
    
    return null;
  }

  private extractPetName(response: string): string | null {
    const petNames = ['love', 'baby', 'cutie', 'yaar', 'cutiee', 'mister', 'handsome', 'sweetheart', 'jaan', 'babe'];
    const lower = response.toLowerCase();
    
    for (const p of petNames) {
      if (lower.startsWith(`hey ${p}`) || lower.startsWith(`arre ${p}`) || lower.startsWith(`hi ${p}`) ||
          lower.startsWith(`yo ${p}`) || lower.startsWith(`${p},`) ||
          lower.includes(` ${p}!`) || lower.includes(` ${p},`) || lower.includes(` ${p} `) ||
          lower.endsWith(` ${p}!`) || lower.endsWith(` ${p}.`) || lower.endsWith(` ${p}`)) {
        return p;
      }
    }
    return null;
  }

  private getAlternativeGreetings(lastGreeting: string): string[] {
    const allGreetings = ['Hey!', 'Hi!', 'Arre!', 'Yo!', 'Hola!', 'Namaste!', 'Kya haal hai?', '(no greeting)'];
    return allGreetings.filter(g => g.toLowerCase() !== lastGreeting.toLowerCase());
  }

  private getAlternativePetNames(lastPetName: string): string[] {
    const allPetNames = ['love', 'baby', 'cutie', 'yaar', 'handsome', 'sweetheart', 'jaan', 'babe', '(no pet name)'];
    return allPetNames.filter(p => p.toLowerCase() !== lastPetName.toLowerCase());
  }

  /**
   * Post-processing filter to fix pet name repetition
   */
  private fixPetNameRepetition(currentResponse: string, lastResponse: string): string {
    const lastPetName = this.extractPetName(lastResponse);
    const currentPetName = this.extractPetName(currentResponse);
    
    // If no repetition, return as-is
    if (!lastPetName || !currentPetName || lastPetName !== currentPetName) {
      return currentResponse;
    }
    
    // Pet name repetition detected - fix it
    console.log(`🔧 POST-PROCESSING: Detected pet name repetition "${currentPetName}" - fixing...`);
    
    // Get alternative pet names
    const alternatives = this.getAlternativePetNames(currentPetName);
    
    // Strategy 1: Remove pet name entirely (60% of time)
    if (Math.random() < 0.6) {
      const withoutPetName = currentResponse
        .replace(new RegExp(`\\b${currentPetName}\\b,?\\s*`, 'gi'), '')
        .replace(/^(hey|hi|arre|yo)\s+,?\s*/i, '') // Remove greeting if it was only followed by pet name
        .trim();
      
      if (withoutPetName.length > 0) {
        console.log(`✅ POST-PROCESSING: Removed pet name "${currentPetName}"`);
        return withoutPetName;
      }
    }
    
    // Strategy 2: Replace with alternative pet name
    if (alternatives.length > 0) {
      const randomAlternative = alternatives[Math.floor(Math.random() * alternatives.length)];
      const fixed = currentResponse.replace(
        new RegExp(`\\b${currentPetName}\\b`, 'gi'), 
        randomAlternative
      );
      console.log(`✅ POST-PROCESSING: Replaced "${currentPetName}" with "${randomAlternative}"`);
      return fixed;
    }
    
    // Strategy 3: Fallback - remove the pet name
    const fallback = currentResponse
      .replace(new RegExp(`\\b${currentPetName}\\b,?\\s*`, 'gi'), '')
      .trim();
    
    console.log(`✅ POST-PROCESSING: Fallback removal of "${currentPetName}"`);
    return fallback.length > 0 ? fallback : currentResponse;
  }
}
