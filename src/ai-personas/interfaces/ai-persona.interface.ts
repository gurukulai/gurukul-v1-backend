export enum AiPersonaType {
  THERAPIST = 'therapist',
  DIETICIAN = 'dietician',
  CAREER = 'career',
}

export interface AiPersonaConfig {
  name: string;
  description: string;
  systemPrompt: string;
  greeting: string;
  capabilities: string[];
  limitations: string[];
}

export interface AiPersonaResponse {
  message: string;
  suggestions?: string[];
  followUpQuestions?: string[];
}

export interface AiPersonaContext {
  type: AiPersonaType;
  conversationHistory: Array<{
    role: string;
    content: string;
  }>;
  userPreferences?: Record<string, any>;
}
