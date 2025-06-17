import { Injectable, Logger } from '@nestjs/common';
import { AiPersonasService } from '../ai-personas/ai-personas.service';
import { AiPersonaType } from '../ai-personas/interfaces/ai-persona.interface';
import {
  WhatsappMessage,
  WhatsappWebhookPayload,
} from './interfaces/whatsapp.interface';
import { UserService } from '../user/user.service';
import { LlmService } from '../llm/llm.service';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly personaPhoneNumbers: Record<string, AiPersonaType> = {
    '+1234567890': 'THERAPIST',
    '+1234567891': 'DIETICIAN',
    '+1234567892': 'CAREER',
  };

  constructor(
    // private readonly prisma: PrismaService,
    private readonly aiPersonasService: AiPersonasService,
    private readonly userService: UserService,
    private readonly llmService: LlmService,
  ) {}

  async handleIncomingMessage(payload: WhatsappWebhookPayload) {
    this.logger.log('Received WhatsApp message:', payload);

    // Extract the first message from the webhook payload
    const message = payload.entry[0]?.changes[0]?.value.messages[0];
    if (!message) throw new Error('No message found in webhook payload');

    // Find or create user
    const user = await this.userService.findOrCreateWhatsAppUser(message.from);
    if (!(message.to in this.personaPhoneNumbers))
      throw new Error('Phone number not recognized');

    // Check if this is a message to one of our AI personas
    const personaType = this.personaPhoneNumbers[message.to];
    await this.handleAiPersonaMessage(user.id, personaType, message);
    return { status: 'success', message: 'Message processed' };
  }

  private async handleAiPersonaMessage(
    userId: number,
    personaType: AiPersonaType,
    message: WhatsappMessage,
  ) {
    // Get conversation history
    const history = await this.userService.getConversationHistory(
      userId,
      personaType,
    );

    // Get system prompt for the persona
    const systemPrompt = this.aiPersonasService.getSystemPrompt(personaType);
    const systemMessage = new SystemMessage(systemPrompt);

    // Convert history to LangChain messages
    const chatHistory = history.map((msg) =>
      msg.fromUser
        ? new HumanMessage({ content: msg.message as string })
        : new AIMessage({ content: msg.message as string }),
    );

    // Get AI response using LangChain
    const aiResponse = await this.llmService.chatWithOpenAI(
      message.body,
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL,
      systemMessage,
      chatHistory,
    );

    // Save both user message and AI response
    await this.userService.saveConversation(
      userId,
      personaType,
      message.body,
      false,
    );

    await this.userService.saveConversation(
      userId,
      personaType,
      aiResponse,
      true,
    );

    return {
      status: 'success',
      message: aiResponse,
    };
  }
}
