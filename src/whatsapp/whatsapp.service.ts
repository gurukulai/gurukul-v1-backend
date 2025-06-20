import { Injectable, Logger } from '@nestjs/common';
import { AiPersonasService } from '../ai-personas/ai-personas.service';
import {
  AiPersonaType,
  AiPersonaContext,
} from '../ai-personas/interfaces/ai-persona.interface';
import { WhatsappWebhookPayload } from './interfaces/whatsapp.interface';
import { UserService } from '../user/user.service';
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

    // Save user message
    await this.userService.saveConversation(
      user.id,
      personaType,
      message.body,
      true,
    );

    const context: AiPersonaContext = {
      type: personaType,
      userId: user.id.toString(),
    };

    // Generate AI response
    const aiResponse = await this.aiPersonasService.getEnhancedResponse(
      message.body,
      personaType,
      context,
    );

    const messages = Array.isArray(aiResponse.message)
      ? aiResponse.message
      : [aiResponse.message];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i] as string;
      // Save AI response
      await this.userService.saveConversation(user.id, personaType, msg, false);
      // Send the response back to the user via WhatsApp
      await this.sendWhatsAppMessage(message.from, msg);
    }

    return { status: 'success' };
  }
}
