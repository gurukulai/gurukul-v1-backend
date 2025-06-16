import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import {
  AiPersonaType,
  AiPersonaContext,
  AiPersonaResponse,
  AiPersonaConfig,
} from './interfaces/ai-persona.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AiPersonasService {
  private readonly logger = new Logger(AiPersonasService.name);
  private readonly personas: Record<AiPersonaType, AiPersonaConfig>;

  constructor(private readonly llmService: LlmService) {
    // Load personas from JSON file
    const personasPath = path.join(__dirname, 'config', 'personas.json');
    const personasData = JSON.parse(fs.readFileSync(personasPath, 'utf8'));
    this.personas = personasData;
  }

  async getResponse(
    context: AiPersonaContext,
    userMessage: string,
    apiKey: string,
  ): Promise<AiPersonaResponse> {
    try {
      const persona = this.personas[context.type];
      if (!persona) {
        throw new Error(`Persona type ${context.type} not found`);
      }

      const conversationHistory = context.conversationHistory || [];

      // Prepare messages for the API call
      const messages = [
        { role: 'system', content: persona.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];

      // Get response from LLM
      const response = await this.llmService.chatWithOpenAI(
        JSON.stringify(messages),
        apiKey,
      );

      // Parse and structure the response
      return this.structureResponse(response);
    } catch (error) {
      this.logger.error(`Error getting response from ${context.type}:`, error);
      throw error;
    }
  }

  getPersonaConfig(type: AiPersonaType): AiPersonaConfig {
    const persona = this.personas[type];
    if (!persona) {
      throw new Error(`Persona type ${type} not found`);
    }
    return persona;
  }

  getAllPersonas(): Record<AiPersonaType, AiPersonaConfig> {
    return this.personas;
  }

  private structureResponse(llmResponse: string): AiPersonaResponse {
    try {
      // Try to parse as JSON if the response is structured
      const parsed = JSON.parse(llmResponse);
      return {
        message: parsed.message || llmResponse,
        suggestions: parsed.suggestions,
        followUpQuestions: parsed.followUpQuestions,
      };
    } catch {
      // If not JSON, return as plain message
      return {
        message: llmResponse,
      };
    }
  }

  // Helper method to get conversation history
  async getConversationHistory(userId: string, personaType: AiPersonaType) {
    // TODO: Implement conversation history retrieval from database
    return [];
  }

  // Helper method to save conversation
  async saveConversation(
    userId: string,
    personaType: AiPersonaType,
    message: string,
    response: AiPersonaResponse,
  ) {
    // TODO: Implement conversation saving to database
    this.logger.log(
      `Saving conversation for user ${userId} with ${personaType}`,
    );
  }
}
