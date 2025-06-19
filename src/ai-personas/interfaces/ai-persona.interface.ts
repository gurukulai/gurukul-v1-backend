export type AiPersonaType = 'THERAPIST' | 'DIETICIAN' | 'CAREER' | 'PRIYA';

export interface AiPersonaConfig {
  name: string;
  systemPrompt: string;
  description: string;
  exampleQuestions?: string[];
  greeting?: string;
  capabilities?: string[];
  limitations?: string[];
  conversationStyle?: ConversationStyle;
  trainingPatterns?: TrainingPattern[];
  personalityTraits?: PersonalityTrait[];
  responseEnhancements?: ResponseEnhancement[];
}

export interface ConversationStyle {
  tone:
    | 'formal'
    | 'casual'
    | 'warm'
    | 'professional'
    | 'friendly'
    | 'flirty'
    | 'romantic';
  responseLength: 'brief' | 'moderate' | 'detailed';
  empathyLevel: number;
  directness: number;
  humorUsage: 'none' | 'light' | 'moderate' | 'frequent';
  languageStyle: 'english' | 'hinglish' | 'multilingual';
  emojiUsage: 'none' | 'light' | 'moderate' | 'frequent';
  multiMessageStyle: boolean;
}

export interface TrainingPattern {
  category: string;
  patterns: ConversationExample[];
}

export interface ConversationExample {
  input: string;
  output: string | string[];
  context?: string;
  emotions?: string[];
  followUpOptions?: string[];
}

export interface PersonalityTrait {
  trait: string;
  intensity: number;
  contexts: string[];
  expressions: string[];
}

export interface ResponseEnhancement {
  type: 'emoji' | 'multi_message' | 'tone_shift' | 'context_aware';
  probability: number;
  configuration: any;
}

export interface AiPersonaResponse {
  message: string | string[];
  suggestions?: string[];
  followUpQuestions?: string[];
  emotions?: string[];
  conversationContext?: ConversationContext;
}

export interface ConversationContext {
  currentMood?: string;
  conversationTone?: string;
  topicHistory?: string[];
  emotionalState?: string;
  lastUserMood?: string;
}

export interface AiPersonaContext {
  type: AiPersonaType;
  userId?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
    mood?: string;
    context?: any;
  }>;
  currentContext?: ConversationContext;
  conversationSummary?: string;
}
