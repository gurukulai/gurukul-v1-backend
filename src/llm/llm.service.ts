import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  // Example for OpenAI GPT-3/4 API
  async chatWithOpenAI(
    prompt: string,
    apiKey: string,
    model = 'gpt-3.5-turbo',
  ): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      this.logger.error('Error communicating with OpenAI:', error);
      throw error;
    }
  }

  // You can add more methods for other LLM providers here
}
