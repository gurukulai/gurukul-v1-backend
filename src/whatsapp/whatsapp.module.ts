import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiPersonasModule } from '../ai-personas/ai-personas.module';
import { UserService } from '../user/user.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [AiPersonasModule, LlmModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, PrismaService, UserService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
