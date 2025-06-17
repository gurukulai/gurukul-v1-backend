import { Module } from '@nestjs/common';
import { AiPersonasService } from './ai-personas.service';

@Module({
  providers: [AiPersonasService],
  exports: [AiPersonasService],
})
export class AiPersonasModule {}
