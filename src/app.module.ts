import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { LlmModule } from './llm/llm.module';
import { AiPersonasModule } from './ai-personas/ai-personas.module';

@Module({
  imports: [AuthModule, WhatsappModule, LlmModule, AiPersonasModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
