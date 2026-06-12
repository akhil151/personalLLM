import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { providerRouter } from '../providers/providerRouter';

async function main() {
  console.log('=== Provider Reality Check ===');
  
  // Test Ollama
  try {
    console.log('\n1. Testing Ollama (primary)...');
    const result = await providerRouter.generate('simple', [
      { role: 'user', content: 'Say "Ollama is working!"' }
    ]);
    console.log('   ✅ Ollama response:', result.content.trim());
  } catch (err: any) {
    console.error('   ❌ Ollama error:', err.message);
  }
  
  // Test embeddings
  try {
    console.log('\n2. Testing Ollama embeddings...');
    const embedding = await providerRouter.embed('Test embedding for reality check');
    console.log('   ✅ Embedding generated, length:', embedding.length);
  } catch (err: any) {
    console.error('   ❌ Embedding error:', err.message);
  }
  
  // Test Groq
  try {
    console.log('\n3. Testing Groq (fallback)...');
    const result = await providerRouter.generate('simple', [
      { role: 'user', content: 'Say "Groq is working!"' }
    ]);
    console.log('   ✅ Groq response:', result.content.trim());
  } catch (err: any) {
    console.error('   ❌ Groq error:', err.message);
  }
  
  console.log('\n=== Provider Reality Check Complete ===');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
