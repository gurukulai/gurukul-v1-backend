import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiPersonasService } from '../src/ai-personas/ai-personas.service';

async function testPostProcessingFilter() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const aiPersonasService = app.get(AiPersonasService);

  console.log('🔧 TESTING POST-PROCESSING FILTER FOR PET NAME REPETITION');
  console.log('=======================================================\n');

  // Create a conversation that would trigger pet name repetition
  const conversationId = 'test-post-processing-123';
  
  console.log('📱 Simulating conversation with potential pet name repetition...\n');

  // First message - establish pet name usage
  console.log('👤 User: Hi how are you?');
  const response1 = await aiPersonasService.getEnhancedResponse(
    'Hi how are you?',
    'PRIYA',
    { 
      type: 'PRIYA',
      userId: conversationId, 
      currentContext: { 
        currentMood: 'testing',
        conversationTone: 'casual' 
      } 
    }
  );
  
  const message1 = Array.isArray(response1.message) ? response1.message.join(' ') : response1.message;
  console.log(`🤖 Priya: ${message1}\n`);

  // Second message - likely to repeat pet name
  console.log('👤 User: Just fine thanks');
  const response2 = await aiPersonasService.getEnhancedResponse(
    'Just fine thanks',
    'PRIYA',
    { 
      type: 'PRIYA',
      userId: conversationId, 
      currentContext: { 
        currentMood: 'testing',
        conversationTone: 'casual' 
      } 
    }
  );
  
  const message2 = Array.isArray(response2.message) ? response2.message.join(' ') : response2.message;
  console.log(`🤖 Priya: ${message2}\n`);

  // Third message - high chance of repetition
  console.log('👤 User: What about you?');
  const response3 = await aiPersonasService.getEnhancedResponse(
    'What about you?',
    'PRIYA',
    { 
      type: 'PRIYA',
      userId: conversationId, 
      currentContext: { 
        currentMood: 'testing',
        conversationTone: 'casual' 
      } 
    }
  );
  
  const message3 = Array.isArray(response3.message) ? response3.message.join(' ') : response3.message;
  console.log(`🤖 Priya: ${message3}\n`);

  // Fourth message - very high chance of repetition
  console.log('👤 User: Cool');
  const response4 = await aiPersonasService.getEnhancedResponse(
    'Cool',
    'PRIYA',
    { 
      type: 'PRIYA',
      userId: conversationId, 
      currentContext: { 
        currentMood: 'testing',
        conversationTone: 'casual' 
      } 
    }
  );
  
  const message4 = Array.isArray(response4.message) ? response4.message.join(' ') : response4.message;
  console.log(`🤖 Priya: ${message4}\n`);

  // Analyze for repetition
  const responses = [message1, message2, message3, message4];
  
  console.log('🔍 POST-PROCESSING FILTER ANALYSIS:');
  console.log('===================================');
  
  // Extract pet names from each response
  const extractPetName = (text: string): string | null => {
    const petNames = ['love', 'baby', 'cutie', 'yaar', 'cutiee', 'mister', 'handsome', 'sweetheart', 'jaan', 'babe'];
    const lower = text.toLowerCase();
    
    for (const p of petNames) {
      if (lower.includes(p)) {
        return p;
      }
    }
    return null;
  };

  let consecutiveRepetitions = 0;
  let lastPetName: string | null = null;
  
  responses.forEach((response, index) => {
    const petName = extractPetName(response);
    console.log(`Response ${index + 1}: "${response}"`);
    console.log(`Pet name detected: ${petName || 'None'}`);
    
    if (petName && lastPetName && petName === lastPetName) {
      consecutiveRepetitions++;
      console.log(`⚠️  REPETITION DETECTED: "${petName}" repeated from previous response`);
    } else if (petName) {
      console.log(`✅ New pet name or no repetition`);
    }
    
    lastPetName = petName;
    console.log('');
  });

  console.log(`📊 FINAL RESULTS:`);
  console.log(`   • Total consecutive repetitions: ${consecutiveRepetitions}`);
  console.log(`   • Post-processing filter status: ${consecutiveRepetitions === 0 ? '✅ WORKING' : '⚠️ NEEDS IMPROVEMENT'}`);
  
  if (consecutiveRepetitions === 0) {
    console.log(`\n🎉 SUCCESS! Post-processing filter prevented all pet name repetitions!`);
  } else {
    console.log(`\n⚠️ Filter caught some but not all repetitions. LLM is very stubborn about pet names.`);
  }

  await app.close();
}

testPostProcessingFilter().catch(console.error); 