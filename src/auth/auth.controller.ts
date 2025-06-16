import { Controller, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('verify-whatsapp')
  async verifyWhatsAppUser(
    @Query('phoneNumber') phoneNumber: string,
  ): Promise<User> {
    return this.authService.findOrCreateWhatsAppUser(phoneNumber);
  }
}
