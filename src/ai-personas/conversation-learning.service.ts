import { Injectable } from '@nestjs/common';
import { AiPersonaType, ConversationContext } from './interfaces/ai-persona.interface';

@Injectable()
export class ConversationLearningService {
  // private readonly logger = new Logger(ConversationLearningService.name);
  
  // In-memory conversation contexts (in production, use Redis or database)
  private conversationContexts = new Map<string, ConversationContext>();

  /**
   * Analyze user input and detect mood/context
   */
  analyzeUserInput(input: string, _userId?: string): {
    mood: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    topics: string[];
    urgency: 'low' | 'medium' | 'high';
  } {
    const lowerInput = input.toLowerCase();
    
    // Mood detection
    let mood = 'neutral';
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let urgency: 'low' | 'medium' | 'high' = 'low';

    // Positive mood indicators
    if (this.containsWords(lowerInput, ['happy', 'excited', 'great', 'amazing', 'awesome', 'love', 'promotion', 'celebration'])) {
      mood = 'happy';
      sentiment = 'positive';
    }
    
    // Negative mood indicators
    else if (this.containsWords(lowerInput, ['sad', 'upset', 'angry', 'stressed', 'worried', 'anxious', 'problem', 'bad day'])) {
      mood = 'upset';
      sentiment = 'negative';
      urgency = 'medium';
    }
    
    // Flirty/romantic mood
    else if (this.containsWords(lowerInput, ['miss you', 'love you', 'beautiful', 'handsome', 'cute', 'date'])) {
      mood = 'romantic';
      sentiment = 'positive';
    }
    
    // Tired/lazy mood
    else if (this.containsWords(lowerInput, ['tired', 'sleepy', 'lazy', 'rest', 'nap'])) {
      mood = 'tired';
    }

    // High urgency indicators
    if (this.containsWords(lowerInput, ['emergency', 'urgent', 'help', 'crisis', 'serious'])) {
      urgency = 'high';
    }

    // Topic extraction (simple keyword-based)
    const topics = this.extractTopics(lowerInput);

    return { mood, sentiment, topics, urgency };
  }

  /**
   * Update conversation context based on interaction
   */
  updateConversationContext(
    userId: string,
    userInput: string,
    aiResponse: string,
    personaType: AiPersonaType
  ): ConversationContext {
    const analysis = this.analyzeUserInput(userInput, userId);
    
    let context = this.conversationContexts.get(userId) || {
      currentMood: 'neutral',
      conversationTone: 'casual',
      topicHistory: [],
      emotionalState: 'stable',
      lastUserMood: 'neutral'
    };

    // Update context
    context.lastUserMood = context.currentMood || 'neutral';
    context.currentMood = analysis.mood;
    context.emotionalState = this.determineEmotionalState(analysis.sentiment, context.emotionalState || 'stable');
    
    // Use aiResponse for future context learning (placeholder for now)
    console.log('AI Response processed for context:', aiResponse.length);
    
    // Update topic history
    if (analysis.topics.length > 0) {
      context.topicHistory = [...(context.topicHistory || []), ...analysis.topics]
        .slice(-10); // Keep only last 10 topics
    }

    // Adjust conversation tone based on persona and mood
    context.conversationTone = this.determineConversationTone(personaType, analysis.mood);

    this.conversationContexts.set(userId, context);
    return context;
  }

  /**
   * Get conversation context for user
   */
  getConversationContext(userId: string): ConversationContext | null {
    return this.conversationContexts.get(userId) || null;
  }

  /**
   * Detect mood transitions (happy -> sad, etc.)
   */
  detectMoodTransition(userId: string, currentMood: string): {
    hasTransition: boolean;
    previousMood?: string;
    transitionType?: 'positive' | 'negative' | 'neutral';
  } {
    const context = this.getConversationContext(userId);
    if (!context || !context.lastUserMood) {
      return { hasTransition: false };
    }

    const previousMood = context.lastUserMood;
    if (previousMood === currentMood) {
      return { hasTransition: false };
    }

    // Determine transition type
    let transitionType: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    const positiveMoods = ['happy', 'excited', 'romantic', 'relieved'];
    const negativeMoods = ['sad', 'upset', 'angry', 'stressed', 'worried'];

    if (negativeMoods.includes(previousMood) && positiveMoods.includes(currentMood)) {
      transitionType = 'positive';
    } else if (positiveMoods.includes(previousMood) && negativeMoods.includes(currentMood)) {
      transitionType = 'negative';
    }

    return {
      hasTransition: true,
      previousMood,
      transitionType
    };
  }

  /**
   * Check for semantic contradictions in user input
   */
  detectSemanticContradiction(input: string): {
    hasContradiction: boolean;
    contradictionType?: string;
    explanation?: string;
  } {
    const lowerInput = input.toLowerCase();

    // Emotional contradictions
    if (this.containsWords(lowerInput, ['sad', 'upset']) && 
        this.containsWords(lowerInput, ['promotion', 'won', 'success', 'passed'])) {
      return {
        hasContradiction: true,
        contradictionType: 'emotional_success',
        explanation: 'User expresses sadness about a positive event'
      };
    }

    if (this.containsWords(lowerInput, ['happy', 'excited']) && 
        this.containsWords(lowerInput, ['failed', 'lost', 'rejected', 'broke up'])) {
      return {
        hasContradiction: true,
        contradictionType: 'emotional_failure',
        explanation: 'User expresses happiness about a negative event'
      };
    }

    // Logical contradictions
    if (this.containsWords(lowerInput, ['stressed', 'worried']) && 
        this.containsWords(lowerInput, ['vacation', 'holiday', 'relaxing'])) {
      return {
        hasContradiction: true,
        contradictionType: 'stress_relaxation',
        explanation: 'User expresses stress about relaxing activities'
      };
    }

    return { hasContradiction: false };
  }

  /**
   * Generate context-aware response modifications
   */
  getResponseModifications(
    userId: string,
    personaType: AiPersonaType,
    userInput: string
  ): {
    shouldUseTrainingData: boolean;
    toneAdjustments?: string[];
    additionalPrompts?: string[];
    responseStyle?: string;
  } {
    const context = this.getConversationContext(userId);
    const analysis = this.analyzeUserInput(userInput, userId);
    const moodTransition = this.detectMoodTransition(userId, analysis.mood);
    const contradiction = this.detectSemanticContradiction(userInput);
    
    // Use context and personaType for processing
    console.log('Processing persona type:', personaType, 'Context:', context?.currentMood);

    let modifications = {
      shouldUseTrainingData: true,
      toneAdjustments: [] as string[],
      additionalPrompts: [] as string[],
      responseStyle: 'normal'
    };

    // Handle mood transitions
    if (moodTransition.hasTransition) {
      if (moodTransition.transitionType === 'negative') {
        modifications.toneAdjustments.push('Show empathy and concern');
        modifications.additionalPrompts.push('Acknowledge the mood change');
      } else if (moodTransition.transitionType === 'positive') {
        modifications.toneAdjustments.push('Show relief and happiness');
        modifications.additionalPrompts.push('Celebrate the positive change');
      }
    }

    // Handle semantic contradictions
    if (contradiction.hasContradiction) {
      modifications.toneAdjustments.push('Express confusion and ask for clarification');
      modifications.additionalPrompts.push('Question the contradiction gently');
      modifications.responseStyle = 'questioning';
    }

    // High urgency responses
    if (analysis.urgency === 'high') {
      modifications.toneAdjustments.push('Respond with immediate concern and attention');
      modifications.responseStyle = 'urgent';
    }

    return modifications;
  }

  private containsWords(text: string, words: string[]): boolean {
    return words.some(word => text.includes(word));
  }

  private extractTopics(input: string): string[] {
    const topics: string[] = [];
    
    // Work-related
    if (this.containsWords(input, ['work', 'office', 'job', 'boss', 'meeting', 'project'])) {
      topics.push('work');
    }
    
    // Family-related
    if (this.containsWords(input, ['family', 'mom', 'dad', 'mummy', 'papa', 'parents'])) {
      topics.push('family');
    }
    
    // Health-related
    if (this.containsWords(input, ['health', 'sick', 'doctor', 'medicine', 'gym', 'exercise'])) {
      topics.push('health');
    }
    
    // Food-related
    if (this.containsWords(input, ['food', 'eat', 'hungry', 'dinner', 'lunch', 'breakfast'])) {
      topics.push('food');
    }

    return topics;
  }

  private determineEmotionalState(
    sentiment: 'positive' | 'negative' | 'neutral',
    currentState: string
  ): string {
    switch (sentiment) {
      case 'positive':
        return 'uplifted';
      case 'negative':
        return 'distressed';
      default:
        return currentState || 'stable';
    }
  }

  private determineConversationTone(personaType: AiPersonaType, mood: string): string {
    if (personaType === 'PRIYA') {
      switch (mood) {
        case 'romantic':
          return 'flirty';
        case 'upset':
          return 'caring';
        case 'happy':
          return 'playful';
        case 'tired':
          return 'gentle';
        default:
          return 'affectionate';
      }
    }
    
    return 'professional';
  }
} 