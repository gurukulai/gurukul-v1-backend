import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { PersonaRagService } from './persona-rag.service';
import { PersonaRagController } from './persona-rag.controller';
import { DocumentProcessor } from './utils/document-processor.util';
import { EmbeddingsManager } from './utils/embeddings-manager.util';
import { PersonaEmbeddingsManager } from './utils/persona-embeddings-manager.util';
import { WhatsAppRAGIntegration } from './utils/whatsapp-rag.integration';
import { LlmModule } from '../llm/llm.module';
import { AiPersonasModule } from '../ai-personas/ai-personas.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [ConfigModule, LlmModule, AiPersonasModule, UserModule],
  controllers: [RagController, PersonaRagController],
  providers: [
    RagService,
    PersonaRagService,
    DocumentProcessor,
    EmbeddingsManager,
    PersonaEmbeddingsManager,
    WhatsAppRAGIntegration,
  ],
  exports: [RagService, PersonaRagService, WhatsAppRAGIntegration],
})
export class RagModule {}
