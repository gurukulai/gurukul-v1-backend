import { Injectable } from '@nestjs/common';
import { personas } from './config/personaSystemPrompt';
import { PersonaType } from './interfaces';

@Injectable()
export class AiPersonasService {
  private readonly personas = personas;

  getSystemPrompt(personaId: PersonaType): string {
    return this.personas[personaId];
  }
}
