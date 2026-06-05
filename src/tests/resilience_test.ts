
import { providerRouter } from '../providers/providerRouter';
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { GeminiProvider } from '../providers/GeminiProvider';

async function runResilienceTest() {
  console.log('--- PHASE Y.6 RESILIENCE TEST ---');
  
  // 1. Mock OpenAI to fail with 429
  const originalOpenAI = (providerRouter as any).providers.find((p: any) => p.name === 'openai');
  const originalGemini = (providerRouter as any).providers.find((p: any) => p.name === 'gemini');

  (providerRouter as any).providers = (providerRouter as any).providers.map((p: any) => {
    if (p.name === 'openai') {
      return {
        ...p,
        generate: async () => {
          console.log('[MOCK] OpenAI throwing 429...');
          throw new Error('429 You exceeded your current quota');
        },
        embed: async () => {
          console.log('[MOCK] OpenAI embedding throwing 429...');
          throw new Error('429 You exceeded your current quota');
        }
      };
    }
    if (p.name === 'gemini') {
      return {
        ...p,
        generate: async () => {
          console.log('[MOCK] Gemini succeeding...');
          return { content: 'This is a response from Gemini after OpenAI failed.', usage: { promptTokens: 10, completionTokens: 5 } };
        },
        embed: async () => {
          console.log('[MOCK] Gemini embedding succeeding...');
          return new Array(1536).fill(0.1);
        }
      };
    }
    return p;
  });

  try {
    console.log('\nTesting Fallback for Generation...');
    const response = await providerRouter.generate('planning', [{ role: 'user', content: 'hello' }]);
    console.log('Response:', response.content);
    if (response.content.includes('Gemini')) {
      console.log('PASS: Fallback to Gemini successful.');
    } else {
      console.error('FAIL: Fallback did not reach Gemini.');
    }

    console.log('\nTesting Fallback for Embeddings...');
    const embedding = await providerRouter.embed('hello');
    console.log('Embedding length:', embedding.length);
    if (embedding.length === 1536) {
      console.log('PASS: Embedding fallback to Gemini successful.');
    } else {
      console.error('FAIL: Embedding fallback failed.');
    }

  } catch (err: any) {
    console.error('TEST FAILED:', err.message);
  } finally {
    // Restore providers
    (providerRouter as any).providers = [originalOpenAI, originalGemini];
  }
}

runResilienceTest();
