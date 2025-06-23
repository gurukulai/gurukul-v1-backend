import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Message } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversationHistory(
    userId: number,
    agentId: string,
  ): Promise<Message[]> {
    return await this.prisma.message.findMany({
      where: { userId, agentId },
      orderBy: { timestamp: 'desc' },
      take: 50, // Limit to last 50 conversations
    });
  }

  async saveConversation(
    userId: number,
    agentId: string,
    chatId: string,
    content: string,
    role: 'user' | 'assistant',
    metadata?: unknown,
  ) {
    await this.prisma.message.create({
      data: {
        userId,
        agentId,
        chatId,
        content,
        role,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  }

  async getLatestMessages(
    userId: number,
    agentId: string,
    limit: number,
  ): Promise<Message[]> {
    return await this.prisma.message.findMany({
      where: { userId, agentId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
