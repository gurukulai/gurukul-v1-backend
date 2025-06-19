import { Module } from '@nestjs/common';
import { AiPersonasService } from './ai-personas.service';
import { TrainingDataService } from './training-data.service';
import { ConversationLearningService } from './conversation-learning.service';
import { PersonasController } from './personas.controller';
import { LlmModule } from '../llm/llm.module';
import { UserModule } from '../user/user.module';
import { SummarizationModule } from '../summarization/summarization.module';

@Module({
  imports: [LlmModule, UserModule, SummarizationModule],
  controllers: [PersonasController],
  providers: [
    AiPersonasService,
    TrainingDataService,
    ConversationLearningService,
  ],
  exports: [
    AiPersonasService,
    TrainingDataService,
    ConversationLearningService,
  ],
})
export class AiPersonasModule {}
