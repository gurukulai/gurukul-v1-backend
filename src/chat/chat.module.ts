import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { WebSocketService } from './websocket.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiPersonasModule } from '../ai-personas/ai-personas.module';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, AiPersonasModule, AuthModule, JwtModule.register({})],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, WebSocketService],
  exports: [ChatService, ChatGateway, WebSocketService],
})
export class ChatModule {}
