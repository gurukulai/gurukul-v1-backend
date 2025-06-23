import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiPersonasService } from '../ai-personas/ai-personas.service';
import { PersonaType } from '../ai-personas/interfaces';

export interface CreateChatDto {
  agentId: string;
}

export interface SendMessageDto {
  content: string;
  agentId: string;
}

export interface UpdateChatDto {
  title: string;
}

export interface MarkMessagesReadDto {
  messageIds: string[];
}

export interface PaginatedMessagesResponse {
  messages: any[];
  hasMore: boolean;
  total: number;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiPersonasService: AiPersonasService,
  ) {}

  async getAllChats(userId: number) {
    const chats = await this.prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return chats.map((chat) => ({
      id: chat.id,
      userId: chat.userId,
      agentId: chat.agentId,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat._count.messages,
      lastMessage: chat.lastMessage,
    }));
  }

  async getChat(chatId: string, userId: number) {
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return {
      chatId: chat.id,
      messages: chat.messages.map((msg) => ({
        id: msg.id,
        chatId: msg.chatId,
        userId: msg.userId,
        agentId: msg.agentId,
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
      })),
      isLoading: false,
      hasNewMessages: false,
      pollCount: 0,
    };
  }

  async createChat(userId: number, createChatDto: CreateChatDto) {
    const { agentId } = createChatDto;

    // Validate agent ID
    const validAgentIds = ['therapist', 'dietician', 'career', 'priya'];
    if (!validAgentIds.includes(agentId)) {
      throw new BadRequestException('Invalid agent ID');
    }

    const chat = await this.prisma.chat.create({
      data: {
        userId,
        agentId,
        title: `New ${agentId} chat`,
        messageCount: 0,
      },
    });

    return {
      id: chat.id,
      userId: chat.userId,
      agentId: chat.agentId,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messageCount,
    };
  }

  async sendMessage(
    chatId: string,
    userId: number,
    sendMessageDto: SendMessageDto,
  ) {
    const { content, agentId } = sendMessageDto;

    // Verify chat exists and belongs to user
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Save user message
    await this.prisma.message.create({
      data: {
        chatId,
        userId,
        agentId,
        content,
        role: 'user',
        metadata: {
          messageIndex: chat.messageCount + 1,
          totalMessages: chat.messageCount + 1,
          read: false,
        },
      },
    });

    // Update chat
    await this.prisma.chat.update({
      where: { id: chatId },
      data: {
        messageCount: { increment: 1 },
        lastMessage: content,
        updatedAt: new Date(),
      },
    });

    // Generate AI response
    const aiResponse = await this.generateAIResponse(
      chatId,
      userId,
      agentId,
      content,
    );

    return aiResponse;
  }

  async getMessages(
    chatId: string,
    userId: number,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedMessagesResponse> {
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { chatId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: { chatId },
      }),
    ]);

    return {
      messages: messages.reverse().map((msg) => ({
        id: msg.id,
        chatId: msg.chatId,
        userId: msg.userId,
        agentId: msg.agentId,
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
      })),
      hasMore: skip + limit < total,
      total,
    };
  }

  async pollNewMessages(
    chatId: string,
    userId: number,
    lastMessageId?: string,
  ) {
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const whereClause: any = { chatId };
    if (lastMessageId) {
      const lastMessage = await this.prisma.message.findUnique({
        where: { id: lastMessageId },
      });
      if (lastMessage) {
        whereClause.timestamp = { gt: lastMessage.timestamp };
      }
    }

    const messages = await this.prisma.message.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
    });

    return messages.map((msg) => ({
      id: msg.id,
      chatId: msg.chatId,
      userId: msg.userId,
      agentId: msg.agentId,
      content: msg.content,
      role: msg.role,
      timestamp: msg.timestamp,
      metadata: msg.metadata,
    }));
  }

  async updateChatTitle(
    chatId: string,
    userId: number,
    updateChatDto: UpdateChatDto,
  ) {
    const { title } = updateChatDto;

    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { title },
    });

    return { success: true };
  }

  async deleteChat(chatId: string, userId: number) {
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    await this.prisma.chat.delete({
      where: { id: chatId },
    });

    return { success: true };
  }

  async markMessagesAsRead(
    chatId: string,
    userId: number,
    markMessagesReadDto: MarkMessagesReadDto,
  ) {
    const { messageIds } = markMessagesReadDto;

    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Update messages to mark as read
    await Promise.all(
      messageIds.map((messageId) =>
        this.prisma.message.updateMany({
          where: { id: messageId, chatId },
          data: {
            metadata: {
              read: true,
            },
          },
        }),
      ),
    );

    return { success: true };
  }

  private async generateAIResponse(
    chatId: string,
    userId: number,
    agentId: string,
    userMessage: string,
  ) {
    // Map agentId to persona type
    const agentToPersonaMap: Record<string, PersonaType> = {
      therapist: 'THERAPIST',
      dietician: 'DIETICIAN',
      career: 'CAREER',
      priya: 'PRIYA',
    };

    const personaType = agentToPersonaMap[agentId];
    if (!personaType) {
      throw new BadRequestException('Invalid agent ID');
    }

    // Get conversation history for context
    const conversationHistory = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { timestamp: 'asc' },
      take: 10, // Last 10 messages for context
    });

    // Build conversation context
    const messages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    // Get system prompt for the persona
    const systemPromptForPersona =
      this.aiPersonasService.getSystemPrompt(personaType);

    // TODO: Integrate with actual AI service (OpenAI, etc.)
    // For now, return a mock response
    const aiResponse = await this.generateMockAIResponse(
      systemPromptForPersona,
      messages,
    );

    // Save AI response
    const savedResponse = await this.prisma.message.create({
      data: {
        chatId,
        userId, // Using same userId for AI responses
        agentId,
        content: aiResponse,
        role: 'assistant',
        metadata: {
          confidence: 0.9,
          messageIndex: conversationHistory.length + 2,
          totalMessages: conversationHistory.length + 2,
          read: false,
        },
      },
    });

    // Update chat
    await this.prisma.chat.update({
      where: { id: chatId },
      data: {
        messageCount: { increment: 1 },
        lastMessage: aiResponse,
        updatedAt: new Date(),
      },
    });

    return {
      id: savedResponse.id,
      chatId: savedResponse.chatId,
      userId: savedResponse.userId,
      agentId: savedResponse.agentId,
      content: savedResponse.content,
      role: savedResponse.role,
      timestamp: savedResponse.timestamp,
      metadata: savedResponse.metadata,
    };
  }

  private async generateMockAIResponse(
    systemPrompt: string,
    messages: any[],
  ): Promise<string> {
    // Mock AI response based on the persona and system prompt
    const lastMessage = messages[messages.length - 1].content.toLowerCase();

    // Use system prompt to determine response style
    if (systemPrompt.includes('therapist')) {
      if (lastMessage.includes('anxious') || lastMessage.includes('stress')) {
        return "I understand you're feeling anxious. Let's explore this together. Can you tell me more about what's causing this anxiety? Remember, it's completely normal to feel this way, and I'm here to support you.";
      }
    } else if (systemPrompt.includes('dietician')) {
      if (lastMessage.includes('diet') || lastMessage.includes('nutrition')) {
        return "I'd be happy to help you with your nutrition goals! To provide the best advice, could you tell me about your current eating habits, any dietary restrictions, and what you're hoping to achieve?";
      }
    } else if (systemPrompt.includes('career')) {
      if (lastMessage.includes('career') || lastMessage.includes('job')) {
        return "I'm here to help you with your career journey! What specific aspect would you like to discuss? Whether it's skill development, job searching, or career planning, I'm ready to assist.";
      }
    }

    return "Thank you for sharing that with me. I'm here to listen and support you. How can I help you further today?";
  }
}
