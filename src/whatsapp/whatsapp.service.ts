import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  WhatsappMessageDto,
  WhatsappImageMessageDto,
  WhatsappDocumentMessageDto,
} from './dto/whatsapp-message.dto';
import { AiPersonasService } from '../ai-personas/ai-personas.service';
import { AiPersonaType } from '../ai-personas/interfaces/ai-persona.interface';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly personaPhoneNumbers: Record<string, AiPersonaType> = {
    '+1234567890': AiPersonaType.THERAPIST, // Replace with actual phone numbers
    '+1234567891': AiPersonaType.DIETICIAN, // Replace with actual phone numbers
    '+1234567892': AiPersonaType.CAREER, // Replace with actual phone numbers
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiPersonasService: AiPersonasService,
  ) {}

  async handleIncomingMessage(message: any) {
    this.logger.log('Received WhatsApp message:', message);

    // Extract message details
    const { from, body, type } = message;

    // Find or create user
    const user = await this.findOrCreateUser(from);

    // Check if this is a message to one of our AI personas
    const personaType = this.personaPhoneNumbers[message.to];
    if (personaType) {
      return this.handleAiPersonaMessage(user.id, personaType, message);
    }

    // Handle regular messages
    return this.handleRegularMessage(user.id, message);
  }

  private async handleAiPersonaMessage(
    userId: number,
    personaType: AiPersonaType,
    message: any,
  ) {
    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        userId,
        personaType,
      );

      // Get conversation history
      const history = await this.getConversationHistory(conversation.id);

      // Prepare context for AI
      const context = {
        type: personaType,
        conversationHistory: history.map((msg) => ({
          role: msg.fromUser ? 'user' : 'assistant',
          content: msg.content,
        })),
      };

      // Get AI response
      const aiResponse = await this.aiPersonasService.getResponse(
        context,
        message.body,
        process.env.OPENAI_API_KEY || '',
      );

      // Save both user message and AI response
      await this.saveWhatsappMessage(conversation.id, message.body, true);
      await this.saveWhatsappMessage(
        conversation.id,
        aiResponse.message,
        false,
      );

      return {
        status: 'success',
        message: aiResponse.message,
      };
    } catch (error) {
      this.logger.error(`Error handling AI persona message: ${error.message}`);
      throw error;
    }
  }

  private async getOrCreateConversation(
    userId: number,
    personaType: AiPersonaType,
  ) {
    const existingConversation =
      await this.prisma.whatsappConversation.findFirst({
        where: {
          userId,
          personaType,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

    if (existingConversation) {
      return existingConversation;
    }

    return this.prisma.whatsappConversation.create({
      data: {
        userId,
        personaType,
      },
    });
  }

  private async getConversationHistory(conversationId: number) {
    return this.prisma.whatsappMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }

  private async saveWhatsappMessage(
    conversationId: number,
    content: string,
    fromUser: boolean,
    metadata?: any,
  ) {
    return this.prisma.whatsappMessage.create({
      data: {
        conversationId,
        content,
        fromUser,
        metadata,
      },
    });
  }

  private async findOrCreateUser(phoneNumber: string) {
    let user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      // Create a new user with a random password (they'll never use it)
      const randomPassword = Math.random().toString(36).slice(-8);
      user = await this.prisma.user.create({
        data: {
          phoneNumber,
          email: `${phoneNumber}@whatsapp.user`, // Temporary email
          password: randomPassword,
          name: `WhatsApp User ${phoneNumber}`,
        },
      });
      this.logger.log(`Created new user for phone number: ${phoneNumber}`);
    }

    return user;
  }

  private async handleRegularMessage(userId: number, message: any) {
    // Handle regular messages (non-AI persona)
    const response = {
      status: 'success',
      message: 'Regular message received',
    };

    // Store the message
    await this.prisma.message.create({
      data: {
        userId,
        content: message.body,
        type: message.type,
        fromUser: true,
        metadata: message,
      },
    });

    return response;
  }
}
