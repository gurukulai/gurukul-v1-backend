import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { AiPersonasService } from './ai-personas.service';
import {
  AiPersonaType,
  AiPersonaContext,
} from './interfaces/ai-persona.interface';

@Controller('ai-personas')
export class AiPersonasController {
  constructor(private readonly aiPersonasService: AiPersonasService) {}

  @Post(':type/chat')
  async chatWithPersona(
    @Param('type') type: AiPersonaType,
    @Body()
    body: {
      message: string;
      userId: string;
      apiKey: string;
      conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
      }>;
    },
  ) {
    const context: AiPersonaContext = {
      type,
      conversationHistory: body.conversationHistory || [],
    };

    const response = await this.aiPersonasService.getResponse(
      context,
      body.message,
      body.apiKey,
    );

    // Save the conversation
    await this.aiPersonasService.saveConversation(
      body.userId,
      type,
      body.message,
      response,
    );

    return response;
  }

  @Get(':type/history/:userId')
  async getConversationHistory(
    @Param('type') type: AiPersonaType,
    @Param('userId') userId: string,
  ) {
    return this.aiPersonasService.getConversationHistory(userId, type);
  }
}
