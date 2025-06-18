import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { AiPersonasService } from './ai-personas.service';
import { TrainingDataService } from './training-data.service';
import { ConversationLearningService } from './conversation-learning.service';
import { ConversationTesterService } from './conversation-tester.service';
import { 
  AiPersonaType, 
  AiPersonaResponse, 
  AiPersonaContext,
  ConversationExample 
} from './interfaces/ai-persona.interface';

interface ConversationRequest {
  message: string;
  personaType: AiPersonaType;
  userId?: string;
  context?: AiPersonaContext;
}

interface TrainingDataRequest {
  personaType: AiPersonaType;
  category: string;
  examples: ConversationExample[];
}

@Controller('personas')
export class PersonasController {
  constructor(
    private readonly aiPersonasService: AiPersonasService,
    private readonly trainingDataService: TrainingDataService,
    private readonly conversationLearningService: ConversationLearningService,
    private readonly conversationTesterService: ConversationTesterService
  ) {}

  /**
   * Get system prompt for a persona
   */
  @Get(':personaType/prompt')
  getSystemPrompt(@Param('personaType') personaType: AiPersonaType): { prompt: string } {
    const prompt = this.aiPersonasService.getSystemPrompt(personaType);
    return { prompt };
  }

  /**
   * Get greeting for a persona
   */
  @Get(':personaType/greeting')
  getGreeting(@Param('personaType') personaType: AiPersonaType): { greeting: string } {
    const greeting = this.aiPersonasService.getGreeting(personaType);
    return { greeting };
  }

  /**
   * Get all available personas
   */
  @Get()
  getAvailablePersonas() {
    const personas = this.aiPersonasService.getAvailablePersonas();
    return {
      personas: personas.map(type => ({
        type,
        name: this.aiPersonasService.getPersona(type).name,
        description: this.aiPersonasService.getPersonaDescription(type),
        supportsMultiMessage: this.aiPersonasService.supportsMultiMessage(type)
      }))
    };
  }

  /**
   * Enhanced conversation endpoint with personality-driven responses
   */
  @Post('conversation')
  async handleConversation(@Body() request: ConversationRequest): Promise<{
    response: AiPersonaResponse;
    usedTrainingData: boolean;
    conversationContext?: any;
  }> {
    const { message, personaType, userId, context } = request;

    try {
      // Get response from LLM with training data context
      const enhancedResponse = await this.aiPersonasService.getEnhancedResponse(
        message,
        personaType,
        context
      );

      if (userId) {
        // Update conversation context
        const responseText = Array.isArray(enhancedResponse.message) 
          ? enhancedResponse.message.join(' ') 
          : enhancedResponse.message;

        const conversationContext = this.conversationLearningService.updateConversationContext(
          userId,
          message,
          responseText,
          personaType
        );

        return {
          response: {
            ...enhancedResponse,
            conversationContext
          },
          usedTrainingData: true,
          conversationContext
        };
      }

      return {
        response: enhancedResponse,
        usedTrainingData: true
      };
    } catch (error) {
      console.error('❌ Enhanced response failed:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Continue to fallback
    }

    // Fallback to basic system prompt
    return {
      response: {
        message: "I'm having trouble right now, but I'm here for you! ❤️",
        suggestions: ["Tell me more", "Help me understand", "Let's talk about something else"]
      },
      usedTrainingData: false
    };
  }

  /**
   * Process message specifically for Priya (with multi-message support)
   */
  @Post('priya/conversation')
  async handlePriyaConversation(@Body() request: {
    message: string;
    userId?: string;
  }): Promise<{
    messages: string[];
    mood?: string;
    context?: any;
  }> {
    const { message, userId } = request;

    try {
      // Get enhanced response for Priya
      const response = await this.aiPersonasService.getEnhancedResponse(
        message,
        'PRIYA',
        userId ? { type: 'PRIYA', userId } : undefined
      );

      let messages: string[];
      
      if (Array.isArray(response.message)) {
        messages = response.message;
      } else {
        // Break single message into multiple if needed
        messages = this.trainingDataService.breakIntoMessages(response.message);
      }

      // Analyze user input for context
      const analysis = userId 
        ? this.conversationLearningService.analyzeUserInput(message, userId)
        : null;

      return {
        messages,
        mood: analysis?.mood,
        context: response.conversationContext
      };
    } catch (error) {
      console.error('Priya conversation failed:', error);
      // Continue to fallback
    }

    // Fallback response
    return {
      messages: ["Hey! 🥰", "I need to learn more about this. Can you teach me?"],
      mood: 'curious'
    };
  }

  /**
   * Add training data for a persona
   */
  @Post('training-data')
  addTrainingData(@Body() request: TrainingDataRequest): { success: boolean; message: string } {
    // This would typically save to database
    // For now, just validate the request
    const { personaType, category, examples } = request;

    if (!personaType || !category || !examples || examples.length === 0) {
      return {
        success: false,
        message: 'Invalid training data request'
      };
    }

    // Here you would save to database
    // await this.trainingDataService.saveTrainingData(personaType, category, examples);

    return {
      success: true,
      message: `Added ${examples.length} training examples for ${personaType} in category ${category}`
    };
  }

  /**
   * Get training patterns for a persona
   */
  @Get(':personaType/training-patterns')
  getTrainingPatterns(
    @Param('personaType') personaType: AiPersonaType,
    @Query('category') category?: string
  ) {
    if (category) {
      const patterns = this.trainingDataService.getTrainingPatterns(category);
      return { category, patterns };
    }

    const allPatterns = this.trainingDataService.getAllTrainingPatterns(personaType);
    return { personaType, patterns: allPatterns };
  }

  /**
   * Analyze conversation context for a user
   */
  @Get('conversation-context/:userId')
  getConversationContext(@Param('userId') userId: string) {
    const context = this.conversationLearningService.getConversationContext(userId);
    return { userId, context };
  }

  /**
   * Test personality features
   */
  @Post('test/mood-analysis')
  testMoodAnalysis(@Body() request: { message: string; userId?: string }) {
    const analysis = this.conversationLearningService.analyzeUserInput(
      request.message,
      request.userId
    );
    
    const contradiction = this.conversationLearningService.detectSemanticContradiction(
      request.message
    );

    return {
      message: request.message,
      analysis,
      contradiction
    };
  }

  /**
   * Test LLM integration directly
   */
  @Post('test/llm')
  async testLLM(@Body() request: { message: string }) {
    try {
      console.log('🧪 Testing LLM directly...');
      console.log('🧪 Environment check - API Key:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
      console.log('🧪 Environment check - Model:', process.env.OPENAI_MODEL || 'NOT SET');
      
      const response = await this.aiPersonasService.getEnhancedResponse(
        request.message,
        'PRIYA',
        { type: 'PRIYA', userId: 'test' }
      );
      
      return {
        success: true,
        response,
        message: 'LLM test successful'
      };
    } catch (error) {
      console.error('🧪 LLM Test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'LLM test failed'
      };
    }
  }

  /**
   * Get response modifications for enhanced conversation
   */
  @Post('response-modifications')
  getResponseModifications(@Body() request: {
    message: string;
    userId: string;
    personaType: AiPersonaType;
  }) {
    const modifications = this.conversationLearningService.getResponseModifications(
      request.userId,
      request.personaType,
      request.message
    );

    return {
      message: request.message,
      modifications
    };
  }

  /**
   * Debug environment variables
   */
  @Get('debug/env')
  debugEnv() {
    return {
      openaiApiKey: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'NOT SET',
      openaiModel: process.env.OPENAI_MODEL || 'NOT SET',
      nodeEnv: process.env.NODE_ENV || 'NOT SET',
      port: process.env.PORT || 'NOT SET'
    };
  }

  @Post('test-priya')
  async testPriyaConversations(): Promise<any> {
    try {
      const results = await this.conversationTesterService.runAllTests();
      const report = await this.conversationTesterService.generateTestReport(results);
      
      return {
        success: true,
        summary: {
          totalTests: results.length,
          passedTests: results.filter(r => r.passed).length,
          failedTests: results.filter(r => !r.passed).length,
          successRate: `${((results.filter(r => r.passed).length / results.length) * 100).toFixed(1)}%`
        },
        results,
        report
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Unknown error occurred during testing'
      };
    }
  }
} 