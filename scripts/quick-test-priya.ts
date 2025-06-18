import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ConversationTesterService } from '../src/ai-personas/conversation-tester.service';

async function quickTest() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const tester = app.get(ConversationTesterService);

  console.log('🚀 Running Quick Priya Test Suite...\n');

  // Test just a few key scenarios
  const quickScenarios = [
    'Basic Flow & Curiosity',
    'Long Conversation Sustainability', 
    'Edge Case - Repetitive User',
    'Playful Fighting and Making Up',
    'Ultra Long Conversation (30+ messages)'
  ];

  const allResults = await tester.runAllTests();
  const results = allResults.filter(r => quickScenarios.includes(r.scenario));
  
  const passed = results.filter(r => r.passed).length;
  const rate = passed / results.length;
  
  console.log(`\n📊 Quick Test Results: ${(rate * 100).toFixed(1)}% (${passed}/${results.length})\n`);
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.scenario}`);
    
    if (result.issues.length > 0) {
      console.log(`  Issues: ${result.issues.slice(0, 2).join(', ')}${result.issues.length > 2 ? '...' : ''}`);
    }
    console.log('');
  });

  await app.close();
}

quickTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
}); 