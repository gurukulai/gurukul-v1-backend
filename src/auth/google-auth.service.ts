import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface GoogleUserInfo {
  sub: string; // Google ID
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}

interface GoogleUserInfoResponse {
  id: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  verified_email: boolean;
  locale: string;
}

export interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string;
    picture?: string;
    googleId: string;
  };
  token: string;
}

@Injectable()
export class GoogleAuthService {
  private googleClient: OAuth2Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.getOrThrow<string>('GOOGLE_REDIRECT_URI'), // Optional for server-side flow
    );
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
  }> {
    try {
      const { tokens } = await this.googleClient.getToken(code);

      if (!tokens.access_token || !tokens.id_token) {
        throw new UnauthorizedException('Invalid token response from Google');
      }

      return {
        access_token: tokens.access_token,
        id_token: tokens.id_token,
        refresh_token: tokens.refresh_token || undefined,
      };
    } catch {
      throw new UnauthorizedException(
        'Failed to exchange authorization code for tokens',
      );
    }
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google ID token');
      }

      return {
        sub: payload.sub,
        name: payload.name || '',
        given_name: payload.given_name || '',
        family_name: payload.family_name || '',
        picture: payload.picture || '',
        email: payload.email || '',
        email_verified: payload.email_verified || false,
        locale: payload.locale || '',
      };
    } catch {
      throw new UnauthorizedException('Failed to verify Google ID token');
    }
  }

  async getUserInfoFromAccessToken(
    accessToken: string,
  ): Promise<GoogleUserInfo> {
    try {
      this.googleClient.setCredentials({ access_token: accessToken });

      const userInfoResponse = await this.googleClient.request({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      });

      const userInfo = userInfoResponse.data as GoogleUserInfoResponse;

      return {
        sub: userInfo.id,
        name: userInfo.name || '',
        given_name: userInfo.given_name || '',
        family_name: userInfo.family_name || '',
        picture: userInfo.picture || '',
        email: userInfo.email || '',
        email_verified: userInfo.verified_email || false,
        locale: userInfo.locale || '',
      };
    } catch {
      throw new UnauthorizedException(
        'Failed to get user info from access token',
      );
    }
  }

  async authenticateWithCode(authorizationCode: string): Promise<AuthResponse> {
    // 1. Exchange authorization code for tokens
    const tokens = await this.exchangeCodeForTokens(authorizationCode);

    // 2. Verify ID token and get user info
    const googleUserInfo = await this.verifyIdToken(tokens.id_token);

    // 3. Authenticate user
    return this.authenticateUser(googleUserInfo);
  }

  async authenticateWithAccessToken(
    accessToken: string,
  ): Promise<AuthResponse> {
    // 1. Get user info from access token
    const googleUserInfo = await this.getUserInfoFromAccessToken(accessToken);

    // 2. Authenticate user
    return this.authenticateUser(googleUserInfo);
  }

  async authenticateUser(
    googleUserInfo: GoogleUserInfo,
  ): Promise<AuthResponse> {
    // Check if user exists
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUserInfo.sub }, { email: googleUserInfo.email }],
      },
    });

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          name: googleUserInfo.name,
          email: googleUserInfo.email,
          googleId: googleUserInfo.sub,
          picture: googleUserInfo.picture,
          authProvider: 'google',
        },
      });
    } else {
      // Update existing user with Google info if they don't have it
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUserInfo.sub,
            picture: googleUserInfo.picture,
            authProvider: 'google',
          },
        });
      }
    }

    return {
      user: {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        picture: user.picture || '',
        googleId: user.googleId || '',
      },
      token: 'jwt-token-will-be-generated-by-auth-service', // This will be handled by AuthService
    };
  }
}
