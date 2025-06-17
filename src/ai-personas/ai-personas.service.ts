import { Injectable } from '@nestjs/common';
import {
  AiPersonaType,
  AiPersonaConfig,
} from './interfaces/ai-persona.interface';
import * as config from './config/personas.json';
@Injectable()
export class AiPersonasService {
  // private readonly logger = new Logger(AiPersonasService.name);
  private readonly personas: Record<AiPersonaType, AiPersonaConfig>;

  constructor() {
    this.personas = config as Record<AiPersonaType, AiPersonaConfig>;
  }

  getPersonaConfig(type: AiPersonaType): AiPersonaConfig {
    return (
      this.personas[type] ||
      (() => {
        throw new Error(`Persona type ${type} not found`);
      })()
    );
  }

  getSystemPrompt(type: AiPersonaType): string {
    const persona = this.getPersonaConfig(type);
    return persona.systemPrompt;
  }

  getAllSystemPrompts(): string {
    const prompts = Object.entries(this.personas).map(
      ([type, config]) => `${type}:\n${config.systemPrompt}\n`,
    );
    return prompts.join('\n---\n\n');
  }
}
