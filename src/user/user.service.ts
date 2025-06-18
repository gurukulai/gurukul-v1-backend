import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiPersonaType } from '../ai-personas/interfaces/ai-persona.interface';
import { Message, User } from '@prisma/client';

@Injectable()
export class UserService {
  // private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateWhatsAppUser(phoneNumber: string): Promise<User> {
    const user: User | null = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      return this.prisma.user.create({
        data: {
          phoneNumber,
          name: `WhatsApp User ${phoneNumber}`,
        },
      });
    }

    return user;
  }

  async getConversationHistory(
    userId: number,
    personaType: AiPersonaType,
  ): Promise<Message[]> {
    return await this.prisma.message.findMany({
      where: { userId, personaType },
      orderBy: { timestamp: 'desc' },
      take: 50, // Limit to last 50 conversations
    });
  }

  async saveConversation(
    userId: number,
    personaType: AiPersonaType,
    message: string,
    fromUser: boolean,
    metadata?: unknown,
  ) {
    await this.prisma.message.create({
      data: {
        userId,
        personaType,
        message: message,
        fromUser: fromUser,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  }

  async getLatestMessages(
    userId: number,
    personaType: AiPersonaType,
    limit: number,
  ): Promise<Message[]> {
    return await this.prisma.message.findMany({
      where: { userId, personaType },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
