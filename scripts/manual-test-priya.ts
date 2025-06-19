import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiPersonasService } from '../src/ai-personas/ai-personas.service';

async function manualTest() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const aiPersonasService = app.get(AiPersonasService);

  console.log('🧪 Testing Priya Manual Conversation...\n');

  const testInputs = [
    'hey',
    'nothing much',
    'just work',
    "I'm fine",
    "I'm fine",
  ];

  const context = {
    type: 'PRIYA' as const,
    userId: 'test-user',
  };

  for (let i = 0; i < testInputs.length; i++) {
    const input = testInputs[i];
    console.log(`👤 User: ${input}`);

    try {
      const response = await aiPersonasService.getEnhancedResponse(
        input,
        'PRIYA',
        context,
      );
      const message = Array.isArray(response.message)
        ? response.message.join(' ')
        : response.message;
      console.log(`💬 Priya: ${message}\n`);
    } catch (error: any) {
      console.log(`❌ Error: ${error?.message || 'Unknown error'}\n`);
    }
  }

  await app.close();
}

manualTest().catch((err) => {
  console.error('Manual test failed:', err);
  process.exit(1);
});
