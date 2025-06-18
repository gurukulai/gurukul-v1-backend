import { Module } from '@nestjs/common';
import { SummarizationService } from './summarization.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [SummarizationService],
  exports: [SummarizationService],
})
export class SummarizationModule {} 