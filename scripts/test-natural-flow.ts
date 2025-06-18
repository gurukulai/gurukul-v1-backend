import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiPersonasService } from '../src/ai-personas/ai-personas.service';
import { ConversationTesterService } from '../src/ai-personas/conversation-tester.service';

async function testNaturalConversationFlow() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const aiPersonasService = app.get(AiPersonasService);
  const testerService = app.get(ConversationTesterService);

  console.log('🧪 TESTING NATURAL CONVERSATION FLOW PATTERNS');
  console.log('Based on real chat analysis from Aarushi-Sarthak conversation\n');

  // Test scenarios based on real conversation patterns
  const testScenarios = [
    {
      name: 'Excited News Sharing',
      messages: [
        'I got the promotion!',
        'Thanks! I start next week',
        'Yeah the salary is much better'
      ]
    },
    {
      name: 'Emotional Support',
      messages: [
        'Feeling really stressed today',
        'Work deadlines are crazy',
        'I think I need a break'
      ]
    },
    {
      name: 'Casual Check-in',
      messages: [
        'What are you doing?',
        'Sounds boring',
        'Want to do something fun?'
      ]
    },
    {
      name: 'Making Plans',
      messages: [
        'Free tonight?',
        'How about dinner?',
        'Pick you up at 8?'
      ]
    },
    {
      name: 'Sharing Daily Life',
      messages: [
        'Just woke up',
        'Slept really late',
        'Have so much work today'
      ]
    },
    {
      name: 'Weather Complaint',
      messages: [
        'It\'s so hot today',
        'AC is not working properly',
        'I hate summer'
      ]
    }
  ];

  const allResponses: string[] = [];
  let conversationId = 'test-natural-flow';

  for (const scenario of testScenarios) {
    console.log(`\n📱 Testing: ${scenario.name}`);
    console.log('=' + '='.repeat(scenario.name.length + 10));

    for (const message of scenario.messages) {
      console.log(`\n👤 User: ${message}`);
      
      const result = await aiPersonasService.getEnhancedResponse(
        message,
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
      
      const response = Array.isArray(result.message) ? result.message.join(' ') : result.message;
      
      allResponses.push(response);
      console.log(`🤖 Priya: ${response}`);
    }
  }

  // Analyze natural conversation patterns
  console.log('\n\n📊 NATURAL CONVERSATION FLOW ANALYSIS');
  console.log('=====================================');

  const analysis = testerService.analyzeConversationFlow(allResponses);

  console.log(`\n🎯 NATURAL FLOW METRICS:`);
  console.log(`   • Contextual Responses: ${analysis.contextualResponses.toFixed(1)}%`);
  console.log(`   • Natural Flow (no greeting): ${analysis.naturalFlow.toFixed(1)}%`);
  console.log(`   • Formulaic Responses: ${analysis.formulaicResponses}`);
  console.log(`   • Contextual Reactivity: ${analysis.contextualReactivity}`);

  console.log(`\n🔄 REPETITION ANALYSIS:`);
  console.log(`   • Consecutive Greeting Repetition: ${analysis.consecutiveGreetingRepetition}`);
  console.log(`   • Consecutive Pet Name Repetition: ${analysis.consecutivePetNameRepetition}`);
  console.log(`   • Greeting Variety: ${analysis.greetingVariety.toFixed(1)}%`);
  console.log(`   • Pet Name Variety: ${analysis.petNameVariety.toFixed(1)}%`);

  console.log(`\n📝 PATTERN DETAILS:`);
  console.log(`   • Greetings Used: ${analysis.greetingsUsed.join(', ') || 'None'}`);
  console.log(`   • Pet Names Used: ${analysis.petNamesUsed.join(', ') || 'None'}`);
  console.log(`   • Unique Greetings: ${analysis.uniqueGreetings.join(', ') || 'None'}`);
  console.log(`   • Unique Pet Names: ${analysis.uniquePetNames.join(', ') || 'None'}`);

  // Real chat comparison
  console.log(`\n🎯 REAL CHAT COMPARISON (Aarushi-Sarthak):`);
  console.log(`   Real chat patterns observed:`);
  console.log(`   • 60% direct responses (no greeting)`);
  console.log(`   • Contextual reactions: "Arree", "DUDE", "Yaar"`);
  console.log(`   • Natural flow: builds on previous context`);
  console.log(`   • Emotional authenticity: matches user's energy`);

  // Success criteria based on real chat
  const successCriteria = {
    naturalFlow: analysis.naturalFlow >= 50, // Should be 50%+ like real chat
    contextualResponses: analysis.contextualResponses >= 30,
    consecutiveGreetingRepetition: analysis.consecutiveGreetingRepetition <= 1,
    consecutivePetNameRepetition: analysis.consecutivePetNameRepetition <= 1,
    formulaicResponses: analysis.formulaicResponses <= 2
  };

  console.log(`\n✅ SUCCESS CRITERIA CHECK:`);
  Object.entries(successCriteria).forEach(([key, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${key}: ${passed ? 'PASS' : 'FAIL'}`);
  });

  const overallSuccess = Object.values(successCriteria).every(Boolean);
  console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS IMPROVEMENT'}`);

  if (!overallSuccess) {
    console.log(`\n💡 IMPROVEMENT SUGGESTIONS:`);
    if (!successCriteria.naturalFlow) {
      console.log(`   • Increase direct responses without greetings (target: 50%+)`);
    }
    if (!successCriteria.contextualResponses) {
      console.log(`   • Add more contextual reactions like "Arree", "Yaar", "Really?"`);
    }
    if (!successCriteria.consecutiveGreetingRepetition) {
      console.log(`   • Eliminate consecutive greeting repetition completely`);
    }
    if (!successCriteria.consecutivePetNameRepetition) {
      console.log(`   • Eliminate consecutive pet name repetition completely`);
    }
    if (!successCriteria.formulaicResponses) {
      console.log(`   • Reduce formulaic "Hey love, how are you?" patterns`);
    }
  }

  await app.close();
}

testNaturalConversationFlow().catch(console.error); 