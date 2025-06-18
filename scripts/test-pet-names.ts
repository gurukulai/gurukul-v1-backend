import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiPersonasService } from '../src/ai-personas/ai-personas.service';

async function testPetNames() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const aiPersonasService = app.get(AiPersonasService);

  console.log('🔍 Testing Pet Name Variety...\\n');

  const testInputs = [
    'hey',
    'good morning', 
    'hi',
    'hello',
    'yo',
    'sup',
    'hey there',
    'hi again'
  ];

  const context = {
    type: 'PRIYA' as const,
    userId: 'test-user'
  };

  const responses: string[] = [];
  const petNames: string[] = [];

  // Extract pet name from response
  function extractPetName(response: string): string | null {
    const petNamesList = ['love', 'baby', 'cutie', 'yaar', 'cutiee', 'mister', 'handsome', 'sweetheart', 'jaan', 'babe'];
    const lower = response.toLowerCase();
    
    for (const p of petNamesList) {
      if (lower.startsWith(`hey ${p}`) || lower.startsWith(`arre ${p}`) || lower.startsWith(`${p},`) ||
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
      const petName = extractPetName(responseText);
      petNames.push(petName || 'none');
      
      console.log(`💬 Priya: ${responseText}`);
      console.log(`🏷️  Pet name detected: ${petName || 'none'}\\n`);
      
    } catch (error: any) {
      console.log(`❌ Error: ${error?.message || 'Unknown error'}\\n`);
    }
  }

  // Analyze results
  console.log('\\n📊 ANALYSIS:');
  console.log('Pet names used:', petNames);
  
  // Check for consecutive repetition
  let consecutiveRepeats = 0;
  for (let i = 1; i < petNames.length; i++) {
    if (petNames[i] !== 'none' && petNames[i] === petNames[i-1]) {
      consecutiveRepeats++;
      console.log(`🚨 CONSECUTIVE REPEAT: "${petNames[i]}" at positions ${i} and ${i+1}`);
    }
  }
  
  // Check for variety
  const uniquePetNames = new Set(petNames.filter(p => p !== 'none'));
  const totalPetNames = petNames.filter(p => p !== 'none').length;
  
  console.log(`\\n📈 RESULTS:`);
  console.log(`- Total responses: ${responses.length}`);
  console.log(`- Responses with pet names: ${totalPetNames}`);
  console.log(`- Unique pet names used: ${uniquePetNames.size}`);
  console.log(`- Consecutive repetitions: ${consecutiveRepeats}`);
  console.log(`- Variety score: ${uniquePetNames.size}/${totalPetNames} = ${(uniquePetNames.size/Math.max(totalPetNames, 1)*100).toFixed(1)}%`);
  
  if (consecutiveRepeats === 0) {
    console.log('\\n✅ SUCCESS: No consecutive pet name repetitions!');
  } else {
    console.log(`\\n❌ FAILED: ${consecutiveRepeats} consecutive repetitions found`);
  }

  await app.close();
}

testPetNames().catch(console.error); 