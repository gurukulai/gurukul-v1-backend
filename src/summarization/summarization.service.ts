import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { Message } from '@prisma/client';

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(private readonly llmService: LlmService) {}

  async summarizeConversation(messages: Message[]): Promise<string> {
    const conversationText = messages
      .map((msg) =>
        msg.fromUser ? `User: ${msg.message}` : `Priya: ${msg.message}`,
      )
      .join('\\n');

    const prompt = `Please summarize the following conversation. The summary should be concise and capture the key points of the conversation. It will be used to provide context to an AI assistant in future conversations, so it should be dense with information. Focus on the user's needs, preferences, and the overall emotional tone of the conversation.

<conversation>
${conversationText}
</conversation>

Summary:`;

    this.logger.log(
      `Generating summary for conversation with ${messages.length} messages.`,
    );

    try {
      const summary = await this.llmService.chatWithOpenAI(prompt);
      this.logger.log(`Generated summary: ${summary}`);
      return summary;
    } catch (error) {
      this.logger.error('Error generating summary:', error);
      throw new Error('Could not generate conversation summary.');
    }
  }
}
