import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Logger,
  Headers,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);
  private readonly VERIFY_TOKEN =
    process.env.WHATSAPP_VERIFY_TOKEN || 'your-verify-token';

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-hub-signature') signature: string,
  ) {
    // Verify the request is from WhatsApp
    if (!this.verifyWhatsAppRequest(signature, payload)) {
      this.logger.error('Invalid WhatsApp request signature');
      return { status: 'error', message: 'Invalid signature' };
    }

    this.logger.log('Received webhook payload:', payload);
    return this.whatsappService.handleIncomingMessage(payload);
  }

  @Get('webhook')
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log('Verifying webhook');

    if (mode === 'subscribe' && token === this.VERIFY_TOKEN) {
      this.logger.log('Webhook verified');
      return challenge;
    }

    this.logger.error('Webhook verification failed');
    return 'Verification failed';
  }

  private verifyWhatsAppRequest(signature: string, payload: any): boolean {
    // In development/localhost, we can bypass this check
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // In production, implement proper signature verification
    // This is a placeholder - you should implement proper HMAC verification
    // using your WhatsApp app secret
    return true;
  }
}
