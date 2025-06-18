import { Module } from '@nestjs/common';
import { AiPersonasService } from './ai-personas.service';
import { TrainingDataService } from './training-data.service';
import { ConversationLearningService } from './conversation-learning.service';
import { PersonasController } from './personas.controller';
import { LlmService } from '../llm/llm.service';

@Module({
  controllers: [PersonasController],
  providers: [AiPersonasService, TrainingDataService, ConversationLearningService, LlmService],
  exports: [AiPersonasService, TrainingDataService, ConversationLearningService],
})
export class AiPersonasModule {}
