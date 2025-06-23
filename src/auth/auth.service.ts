import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  GoogleAuthService,
  // GoogleUserInfo,
  AuthResponse,
} from './google-auth.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  async loginWithGoogleCode(authorizationCode: string): Promise<AuthResponse> {
    // 1. Exchange authorization code for tokens and authenticate user
    const authResult =
      await this.googleAuthService.authenticateWithCode(authorizationCode);

    // 2. Generate JWT
    const token = this.jwtService.sign({
      sub: authResult.user.id,
      email: authResult.user.email,
      googleId: authResult.user.googleId,
    });

    return {
      ...authResult,
      token,
    };
  }

  async loginWithGoogleAccessToken(accessToken: string): Promise<AuthResponse> {
    // 1. Get user info from access token and authenticate user
    const authResult =
      await this.googleAuthService.authenticateWithAccessToken(accessToken);

    // 2. Generate JWT
    const token = this.jwtService.sign({
      sub: authResult.user.id,
      email: authResult.user.email,
      googleId: authResult.user.googleId,
    });

    return {
      ...authResult,
      token,
    };
  }
}
