import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { DocumentProcessor } from './utils/document-processor.util';
import { EmbeddingsManager } from './utils/embeddings-manager.util';
import { WhatsAppRAGIntegration } from './utils/whatsapp-rag.integration';
import { LlmModule } from '../llm/llm.module';
import { AiPersonasModule } from '../ai-personas/ai-personas.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [ConfigModule, LlmModule, AiPersonasModule, UserModule],
  controllers: [RagController],
  providers: [
    RagService,
    DocumentProcessor,
    EmbeddingsManager,
    WhatsAppRAGIntegration,
  ],
  exports: [RagService, WhatsAppRAGIntegration],
})
export class RagModule {}
