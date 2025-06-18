import { Injectable, Logger } from '@nestjs/common';
import { AiPersonasService } from '../ai-personas/ai-personas.service';
import { AiPersonaType } from '../ai-personas/interfaces/ai-persona.interface';
import { WhatsappWebhookPayload } from './interfaces/whatsapp.interface';
import { UserService } from '../user/user.service';
import { LlmService } from '../llm/llm.service';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';
import { Message } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  constructor(
    // private readonly prisma: PrismaService,
    private readonly aiPersonasService: AiPersonasService,
    private readonly userService: UserService,
    private readonly llmService: LlmService,
  ) {
    if (!this.PHONE_NUMBER_ID || !this.ACCESS_TOKEN) {
      throw new Error(
        'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set',
      );
    }
  }

  private async sendWhatsAppMessage(
    to: string,
    message: string,
  ): Promise<void> {
    await axios.post(
      `https://graph.facebook.com/v22.0/${this.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${this.ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  private async generateAIResponse(
    userMessage: string,
    personaType: AiPersonaType,
    history: Message[],
  ): Promise<string> {
    // Get system prompt for the persona
    const systemPrompt = this.aiPersonasService.getSystemPrompt(personaType);
    const systemMessage = new SystemMessage(systemPrompt);

    // Convert history to LangChain messages
    const chatHistory = history.map((msg) =>
      msg.fromUser
        ? new HumanMessage({ content: String(msg.message) })
        : new AIMessage({ content: String(msg.message) }),
    );

    // Get AI response using LangChain
    const aiResponse = await this.llmService.chatWithOpenAI(
      userMessage,
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL,
      systemMessage,
      chatHistory,
    );

    return aiResponse;
  }

  async handleIncomingMessage(
    payload: WhatsappWebhookPayload,
    personaType: AiPersonaType,
  ) {
    this.logger.log('Received WhatsApp message:', payload);

    // Extract the first message from the webhook payload
    const message = payload.entry[0]?.changes[0]?.value.messages[0];
    if (!message) throw new Error('No message found in webhook payload');

    // Find or create user
    const user = await this.userService.findOrCreateWhatsAppUser(message.from);

    // Get conversation history
    const history = await this.userService.getConversationHistory(
      user.id,
      personaType,
    );

    // Save user message
    await this.userService.saveConversation(
      user.id,
      personaType,
      message.body,
      true,
    );

    // Wait for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const newMessages = await this.userService.getLatestMessages(
      user.id,
      personaType,
      1,
    );

    if (newMessages.length !== 0) return { status: 'success' };

    // Generate AI response
    const aiResponse = await this.generateAIResponse(
      message.body,
      personaType,
      history,
    );

    // Save AI response
    void this.userService.saveConversation(
      user.id,
      personaType,
      aiResponse,
      false,
    );

    // Send the response back to the user via WhatsApp
    void this.sendWhatsAppMessage(message.from, aiResponse);

    return {
      status: 'success',
      message: aiResponse,
    };
  }
}
