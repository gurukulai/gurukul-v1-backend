import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
} from '@langchain/core/messages';

@Injectable()
export class LlmService {
  // private readonly logger = new Logger(LlmService.name);

  // Example for OpenAI GPT-3/4 API
  async chatWithOpenAI(
    prompt: string,
    SystemMessage?: SystemMessage,
    chatHistory?: Array<HumanMessage | AIMessage>,
    model: string | undefined = process.env.OPENAI_MODEL,
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key is required in .env file');
    if (!model) throw new Error('OpenAI model is required in .env file');

    const chat = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
    });

    const messages: BaseMessage[] = [];

    // Add chat history
    if (SystemMessage) messages.push(SystemMessage);
    messages.push(...(chatHistory || []));
    messages.push(new HumanMessage(prompt));

    const response = await chat.invoke(messages);
    const content = response.content;
    return typeof content === 'string' ? content : JSON.stringify(content);
  }
}
