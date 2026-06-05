
import { OpenAIProvider } from './src/providers/OpenAIProvider.js';
import { GeminiProvider } from './src/providers/GeminiProvider.js';
import { OpenRouterProvider } from './src/providers/OpenRouterProvider.js';
import dotenv from 'dotenv';
dotenv.config();

async function auditProviders() {
  console.log('--- PART 1: PROVIDER INVENTORY AUDIT ---');
  
  const providers = [
    new OpenAIProvider(),
    new GeminiProvider(),
    new OpenRouterProvider(),
  ];

  const results = [];

  for (const provider of providers) {
    const start = Date.now();
    let status = 'OK';
    let latency = 0;
    let modelUsed = '';

    try {
      if (provider.name === 'openai') {
        modelUsed = 'gpt-4o-mini';
      } else if (provider.name === 'gemini') {
        modelUsed = 'gemini-1.5-flash';
      } else if (provider.name === 'openrouter') {
        modelUsed = 'anthropic/claude-3-haiku';
      }
      
      await provider.generate([{ role: 'user', content: 'health check' }], { model: modelUsed });
      latency = Date.now() - start;
    } catch (err: any) {
      status = `FAILED: ${err.message}`;
    }

    results.push({
      Provider: provider.name,
      Status: status,
      Latency: latency > 0 ? `${latency}ms` : 'N/A',
      ModelUsed: modelUsed
    });
  }

  console.table(results);
}

auditProviders();
