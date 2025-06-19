import { Module } from '@nestjs/common';
import { AiPersonasService } from './ai-personas.service';
import { TrainingDataService } from './training-data.service';
import { ConversationLearningService } from './conversation-learning.service';
import { ConversationFlowService } from './conversation-flow.service';
import { ConversationTesterService } from './conversation-tester.service';
import { PersonasController } from './personas.controller';
import { LlmModule } from '../llm/llm.module';
import { LlmService } from '../llm/llm.service';
import { UserModule } from '../user/user.module';
import { SummarizationModule } from '../summarization/summarization.module';

@Module({
  imports: [LlmModule, UserModule, SummarizationModule],
  controllers: [PersonasController],
  providers: [
    AiPersonasService,
    TrainingDataService,
    ConversationLearningService,
    ConversationFlowService,
    ConversationTesterService,
    LlmService,
  ],
  exports: [
    AiPersonasService,
    TrainingDataService,
    ConversationLearningService,
    ConversationFlowService,
    ConversationTesterService,
  ],
})
export class AiPersonasModule {}
