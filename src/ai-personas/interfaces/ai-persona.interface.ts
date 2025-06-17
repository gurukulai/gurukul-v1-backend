export type AiPersonaType = 'THERAPIST' | 'DIETICIAN' | 'CAREER';

export interface AiPersonaConfig {
  systemPrompt: string;
  description: string;
  exampleQuestions?: string[];
}

export interface AiPersonaResponse {
  message: string;
  suggestions?: string[];
  followUpQuestions?: string[];
}

export interface AiPersonaContext {
  type: AiPersonaType;
  userId?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
