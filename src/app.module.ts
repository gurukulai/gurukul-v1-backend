import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { LlmModule } from './llm/llm.module';
import { AiPersonasModule } from './ai-personas/ai-personas.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { RagModule } from './rag/rag.module';
import { SummarizationModule } from './summarization/summarization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WhatsappModule,
    LlmModule,
    AiPersonasModule,
    UserModule,
    PrismaModule,
    RagModule,
    SummarizationModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
