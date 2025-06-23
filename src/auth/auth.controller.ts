import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google/code')
  async googleLoginWithCode(@Body('code') authorizationCode: string) {
    return this.authService.loginWithGoogleCode(authorizationCode);
  }

  @Post('google/token')
  async googleLoginWithToken(@Body('access_token') accessToken: string) {
    return this.authService.loginWithGoogleAccessToken(accessToken);
  }
}
