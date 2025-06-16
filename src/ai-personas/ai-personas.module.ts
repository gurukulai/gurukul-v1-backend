import { Module } from '@nestjs/common';
import { AiPersonasService } from './ai-personas.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [AiPersonasService],
  exports: [AiPersonasService],
})
export class AiPersonasModule {}
