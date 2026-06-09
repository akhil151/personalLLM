
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { providerRouter } from '../providers/providerRouter';

async function runFailoverCertification() {
  console.log('====================================================');
  console.log('PHASE Z.4.2.A — FAILOVER CERTIFICATION');
  console.log('====================================================\n');

  console.log('[TEST] Simulating Ollama failure by mocking an error...');

  // Get the ollama provider instance and mock its generate method
  const ollama = (providerRouter as any).providers.find((p: any) => p.name === 'ollama');
  if (ollama) {
    const originalGenerate = ollama.generate;
    ollama.generate = async () => {
      console.log('[MOCK] Ollama is failing as requested...');
      throw new Error('Simulated Ollama Connection Failure');
    };

    console.log('\n[TEST] Attempting generation (should failover to Groq)...');
    const start = Date.now();
    
    try {
      const result = await providerRouter.generate('chat', [{ role: 'user', content: 'Say "Groq Active"' }]);
      const end = Date.now();
      
      console.log(`\n[SUCCESS] Received response in ${end - start}ms`);
      console.log(`[CONTENT] ${result.content}`);
      
      console.log('[PASS] Received response after Ollama failure. Verify provider in logs.');
    } catch (err: any) {
      console.error(`[FAIL] Failover failed: ${err.message}`);
    } finally {
      // Restore original method
      ollama.generate = originalGenerate;
    }
  } else {
    console.error('[FAIL] Ollama provider not found in router.');
  }
}

runFailoverCertification();
