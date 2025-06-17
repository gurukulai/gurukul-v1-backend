import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Logger,
  Headers,
  HttpException,
  HttpStatus,
  // Param,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookPayload } from './interfaces/whatsapp.interface';
import * as crypto from 'crypto';
// import { AiPersonaType } from 'src/ai-personas/interfaces/ai-persona.interface';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);
  private readonly VERIFY_TOKEN =
    process.env.WHATSAPP_VERIFY_TOKEN ||
    (() => {
      throw new Error('WHATSAPP_VERIFY_TOKEN environment variable is not set');
    })();
  private readonly ACCESS_TOKEN =
    process.env.WHATSAPP_ACCESS_TOKEN ||
    (() => {
      throw new Error('WHATSAPP_ACCESS_TOKEN environment variable is not set');
    })();

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post(':personaType/webhook')
  async handleWebhook(
    @Body() payload: WhatsappWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
    // @Param('personaType') personaType: AiPersonaType,
  ) {
    try {
      // Verify the request is from WhatsApp
      if (!this.verifyWhatsAppRequest(signature, payload)) {
        this.logger.error('Invalid WhatsApp request signature');
        throw new HttpException('Invalid signature', HttpStatus.FORBIDDEN);
      }

      this.logger.log('Received webhook payload:', payload);
      return this.whatsappService.handleIncomingMessage(payload);
    } catch (error) {
      this.logger.error('Webhook processing error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':personaType/webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log('Verifying webhook');

    if (!mode || !token || !challenge) {
      throw new HttpException(
        'Missing required parameters',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (mode !== 'subscribe') {
      throw new HttpException('Invalid mode', HttpStatus.BAD_REQUEST);
    }

    if (token === this.VERIFY_TOKEN) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.error('Webhook verification failed - invalid token');
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  private verifyWhatsAppRequest(
    signature: string,
    payload: WhatsappWebhookPayload,
  ): boolean {
    // In development/localhost, we can bypass this check
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    if (!signature) {
      this.logger.error('Missing X-Hub-Signature-256 header');
      return false;
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', this.ACCESS_TOKEN)
      .update(JSON.stringify(payload))
      .digest('hex')}`;

    return signature === expectedSignature;
  }
}
