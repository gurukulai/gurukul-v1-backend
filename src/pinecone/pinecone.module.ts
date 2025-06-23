import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PineconeService } from './pinecone.service';
import { PineconeController } from './pinecone.controller';
import { ExpertsService } from './experts.service';
import { DocumentsService } from './documents.service';
import { QueryService } from './query.service';
import { QueryIntelligenceService } from './query-intelligence.service';

@Module({
  imports: [ConfigModule],
  providers: [
    PineconeService,
    ExpertsService,
    DocumentsService,
    QueryService,
    QueryIntelligenceService,
  ],
  controllers: [PineconeController],
  exports: [PineconeService, ExpertsService, DocumentsService, QueryService],
})
export class PineconeModule {}
