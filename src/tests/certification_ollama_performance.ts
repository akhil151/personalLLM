
import { providerRouter } from '../providers/providerRouter';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runPerformanceCertification() {
  console.log('====================================================');
  console.log('PHASE Z.4.2.A — OLLAMA PERFORMANCE CERTIFICATION');
  console.log('====================================================\n');

  const prompts = [
    "What is machine learning?",
    "Break the goal 'Get an ML internship' into actionable tasks.",
    "Design a production-grade AI assistant architecture."
  ];

  const results = [];

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`\nTEST ${i + 1}: "${prompt}"`);
    console.log('----------------------------------------------------');

    const start = Date.now();
    try {
      // We use stream to capture first token latency manually in the test 
      // even though OllamaProvider already logs it.
      let firstTokenTime = 0;
      let content = '';

      const stream = providerRouter.stream('chat', [{ role: 'user', content: prompt }]);
      
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
          console.log(`[LATENCY] First token received in ${firstTokenTime - start}ms`);
        }
        content += chunk;
      }

      const end = Date.now();
      const totalMs = end - start;
      const firstTokenMs = firstTokenTime - start;
      const completionMs = end - firstTokenTime;

      console.log(`[LATENCY] Total runtime: ${totalMs}ms`);

      results.push({
        prompt: prompt.substring(0, 30) + '...',
        firstTokenMs,
        completionMs,
        totalMs,
        length: content.length
      });
    } catch (err: any) {
      console.error(`[FAIL] Test ${i + 1} failed: ${err.message}`);
      results.push({
        prompt: prompt.substring(0, 30) + '...',
        error: err.message
      });
    }
  }

  console.log('\n====================================================');
  console.log('PERFORMANCE SUMMARY');
  console.log('====================================================');
  console.table(results);

  const avgFirstToken = results.reduce((acc, r) => acc + (r.firstTokenMs || 0), 0) / results.length;
  const avgTotal = results.reduce((acc, r) => acc + (r.totalMs || 0), 0) / results.length;

  console.log(`\nAverage First Token Latency: ${avgFirstToken.toFixed(2)}ms`);
  console.log(`Average Total Latency: ${avgTotal.toFixed(2)}ms`);
}

runPerformanceCertification();
