import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateWhatsAppUser(phoneNumber: string): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phoneNumber,
          email: `${phoneNumber}@whatsapp.user`,
          password: '', // No password needed for WhatsApp users
          name: `WhatsApp User ${phoneNumber}`,
        },
      });
    }

    return user;
  }
}
