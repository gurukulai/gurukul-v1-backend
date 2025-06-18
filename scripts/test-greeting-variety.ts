import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiPersonasService } from '../src/ai-personas/ai-personas.service';

async function testGreetingVariety() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const aiPersonasService = app.get(AiPersonasService);

  console.log('🎯 Testing Greeting Variety (No "Hey!" Repetition)...\n');

  const testInputs = [
    'hey',
    'hi', 
    'hello',
    'yo',
    'sup',
    'good morning',
    'hey there',
    'wassup',
    'hola',
    'namaste'
  ];

  const context = {
    type: 'PRIYA' as const,
    userId: 'test-greeting-variety'
  };

  const responses: string[] = [];
  const greetings: string[] = [];
  const petNames: string[] = [];

  // Extract greeting from response
  function extractGreeting(response: string): string | null {
    const lower = response.toLowerCase().trim();
    
    if (lower.startsWith('hey!')) return 'hey!';
    if (lower.startsWith('hey ')) return 'hey';
    if (lower.startsWith('hi!')) return 'hi!';
    if (lower.startsWith('hi ')) return 'hi';
    if (lower.startsWith('hello!')) return 'hello!';
    if (lower.startsWith('hello ')) return 'hello';
    if (lower.startsWith('arre!')) return 'arre!';
    if (lower.startsWith('arre ')) return 'arre';
    if (lower.startsWith('yo!')) return 'yo!';
    if (lower.startsWith('yo ')) return 'yo';
    if (lower.startsWith('namaste')) return 'namaste';
    if (lower.startsWith('hola')) return 'hola';
    if (lower.startsWith('good morning')) return 'good morning';
    if (lower.startsWith('kya haal')) return 'kya haal';
    if (lower.startsWith('kya scene')) return 'kya scene';
    
    return null;
  }

  // Extract pet name from response
  function extractPetName(response: string): string | null {
    const petNamesList = ['love', 'baby', 'cutie', 'yaar', 'cutiee', 'mister', 'handsome', 'sweetheart', 'jaan', 'babe'];
    const lower = response.toLowerCase();
    
    for (const p of petNamesList) {
      if (lower.startsWith(`hey ${p}`) || lower.startsWith(`arre ${p}`) || lower.startsWith(`hi ${p}`) ||
          lower.startsWith(`yo ${p}`) || lower.startsWith(`${p},`) ||
          lower.includes(` ${p}!`) || lower.includes(` ${p},`) || lower.includes(` ${p} `) ||
          lower.endsWith(` ${p}!`) || lower.endsWith(` ${p}.`) || lower.endsWith(` ${p}`)) {
        return p;
      }
    }
    return null;
  }

  for (let i = 0; i < testInputs.length; i++) {
    const input = testInputs[i];
    console.log(`👤 User: ${input}`);
    
    try {
      const response = await aiPersonasService.getEnhancedResponse(input, 'PRIYA', context);
      const responseText = Array.isArray(response.message) ? response.message.join(' ') : response.message;
      
      responses.push(responseText);
      const greeting = extractGreeting(responseText);
      const petName = extractPetName(responseText);
      
      greetings.push(greeting || 'none');
      petNames.push(petName || 'none');
      
      console.log(`💬 Priya: ${responseText}`);
      console.log(`🏷️  Greeting: ${greeting || 'none'} | Pet name: ${petName || 'none'}\n`);
      
    } catch (error: any) {
      console.log(`❌ Error: ${error?.message || 'Unknown error'}\n`);
    }
  }

  // Analyze results
  console.log('\n📊 ANALYSIS:');
  console.log('Greetings used:', greetings);
  console.log('Pet names used:', petNames);
  
  // Check for consecutive greeting repetition
  let consecutiveGreetingRepeats = 0;
  for (let i = 1; i < greetings.length; i++) {
    if (greetings[i] !== 'none' && greetings[i] === greetings[i-1]) {
      consecutiveGreetingRepeats++;
      console.log(`🚨 CONSECUTIVE GREETING REPEAT: "${greetings[i]}" at positions ${i} and ${i+1}`);
    }
  }
  
  // Check for consecutive pet name repetition
  let consecutivePetRepeats = 0;
  for (let i = 1; i < petNames.length; i++) {
    if (petNames[i] !== 'none' && petNames[i] === petNames[i-1]) {
      consecutivePetRepeats++;
      console.log(`🚨 CONSECUTIVE PET NAME REPEAT: "${petNames[i]}" at positions ${i} and ${i+1}`);
    }
  }
  
  // Check for variety
  const uniqueGreetings = new Set(greetings.filter(g => g !== 'none'));
  const totalGreetings = greetings.filter(g => g !== 'none').length;
  
  console.log(`\n📈 RESULTS:`);
  console.log(`- Total responses: ${responses.length}`);
  console.log(`- Responses with greetings: ${totalGreetings}`);
  console.log(`- Unique greetings used: ${uniqueGreetings.size}`);
  console.log(`- Greeting variety score: ${uniqueGreetings.size}/${Math.max(totalGreetings, 1)} = ${(uniqueGreetings.size/Math.max(totalGreetings, 1)*100).toFixed(1)}%`);
  console.log(`- Consecutive greeting repetitions: ${consecutiveGreetingRepeats}`);
  console.log(`- Consecutive pet name repetitions: ${consecutivePetRepeats}`);
  
  const passed = consecutiveGreetingRepeats === 0 && consecutivePetRepeats === 0;
  
  if (passed) {
    console.log('\n✅ SUCCESS: No consecutive repetitions found!');
  } else {
    console.log(`\n❌ FAILED: Found ${consecutiveGreetingRepeats + consecutivePetRepeats} consecutive repetitions`);
  }

  await app.close();
}

testGreetingVariety().catch(console.error); 