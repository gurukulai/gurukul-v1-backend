import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ConversationTesterService } from '../src/ai-personas/conversation-tester.service';

async function main() {
  const maxIterations = 3;
  const targetPassRate = 1.0; // 100%

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const tester = app.get(ConversationTesterService);

  for (let i = 1; i <= maxIterations; i++) {
    console.log(`\n\n===== ITERATION ${i} =====`);
    const results = await tester.runAllTests();
    const passed = results.filter((r) => r.passed).length;
    const rate = passed / results.length;
    console.log(
      `Pass rate: ${(rate * 100).toFixed(1)}% (${passed}/${results.length})`,
    );

    if (rate >= targetPassRate) {
      console.log('✅ All tests passed!');
      break;
    } else {
      console.log('Some tests failed. See detailed issues below:');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`\n--- ${r.scenario} ---`);
          r.issues.forEach((iss) => console.log(`• ${iss}`));
        });
      // Here we could trigger automatic adjustments, but for safety we just stop.
      break;
    }
  }

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
