import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PineconeService } from './pinecone.service';
import { PineconeController } from './pinecone.controller';

@Module({
  imports: [ConfigModule],
  providers: [PineconeService],
  controllers: [PineconeController],
  exports: [PineconeService],
})
export class PineconeModule {}
