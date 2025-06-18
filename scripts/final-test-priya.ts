import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiPersonasService } from '../src/ai-personas/ai-personas.service';

async function finalTest() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const aiPersonasService = app.get(AiPersonasService);

  console.log('🎯 Final Comprehensive Priya Test\n');

  // Test different scenarios
  const scenarios = [
    {
      name: 'Pet Name Variety Test',
      inputs: ['hey', 'hi', 'hello', 'yo', 'sup']
    },
    {
      name: 'Repetitive User Input Test', 
      inputs: ['I\'m fine', 'I\'m fine', 'I\'m fine', 'nothing much', 'nothing much']
    },
    {
      name: 'Long Conversation Test',
      inputs: ['hey', 'good', 'work was okay', 'tell me about your day', 'that sounds fun', 'what else?', 'nice', 'any plans tonight?']
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n🧪 ${scenario.name}:`);
    console.log('='.repeat(50));
    
    const context = {
      type: 'PRIYA' as const,
      userId: `test-${scenario.name.replace(/\s+/g, '-').toLowerCase()}`
    };

    const responses: string[] = [];
    const petNames: string[] = [];
    const stories: string[] = [];

    for (let i = 0; i < scenario.inputs.length; i++) {
      const input = scenario.inputs[i];
      console.log(`👤 User: ${input}`);
      
      try {
        const response = await aiPersonasService.getEnhancedResponse(input, 'PRIYA', context);
        const responseText = Array.isArray(response.message) ? response.message.join(' ') : response.message;
        
        responses.push(responseText);
        console.log(`💬 Priya: ${responseText}\n`);
        
        // Track pet names
        const petName = extractPetName(responseText);
        petNames.push(petName || 'none');
        
        // Track stories
        if (responseText.toLowerCase().includes('orientation') || 
            responseText.toLowerCase().includes('ice-breaker') ||
            responseText.toLowerCase().includes('ice breaker')) {
          stories.push(`orientation-${i}`);
        }
        
      } catch (error: any) {
        console.log(`❌ Error: ${error?.message || 'Unknown error'}\n`);
      }
    }

    // Analysis
    console.log('📊 Analysis:');
    
    // Pet name analysis
    const consecutiveRepeats = countConsecutiveRepeats(petNames);
    const uniquePetNames = new Set(petNames.filter(p => p !== 'none'));
    console.log(`- Pet names: ${petNames.join(' → ')}`);
    console.log(`- Consecutive repeats: ${consecutiveRepeats}`);
    console.log(`- Unique pet names: ${uniquePetNames.size}`);
    
    // Story repetition analysis
    const storyRepeats = stories.length > 1 ? stories.length - 1 : 0;
    console.log(`- Story repetitions: ${storyRepeats}`);
    
    // Overall assessment
    const passed = consecutiveRepeats === 0 && storyRepeats === 0;
    console.log(`- Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  }

  await app.close();
}

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

function countConsecutiveRepeats(petNames: string[]): number {
  let count = 0;
  for (let i = 1; i < petNames.length; i++) {
    if (petNames[i] !== 'none' && petNames[i] === petNames[i-1]) {
      count++;
    }
  }
  return count;
}

finalTest().catch(console.error); 