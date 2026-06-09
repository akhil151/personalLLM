
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createOpenAI } from '@ai-sdk/openai';
import { LLMProvider, LLMMessage, LLMResponse } from './LLMProvider';
import { OllamaProvider } from './OllamaProvider';
import { GroqProvider } from './GroqProvider';

export type TaskType = 'simple' | 'chat' | 'planning' | 'research' | 'vision';

export class ProviderRouter {
  private providers: LLMProvider[];
  private fallbackOrder: string[] = ['groq'];
  private inactiveProviders: Set<string> = new Set([]);
  
  // PHASE Z.4.1.5: Provider Health Tracking
  private providerHealth: Map<string, { 
    status: 'available' | 'cooldown', 
    cooldownUntil: number,
    consecutiveFailures: number 
  }> = new Map();

  constructor() {
    this.providers = [
      new OllamaProvider(),
      new GroqProvider(),
    ];
    
    // Initialize health
    this.providers.forEach(p => {
      this.providerHealth.set(p.name, { status: 'available', cooldownUntil: 0, consecutiveFailures: 0 });
    });
  }

  private isAvailable(name: string): boolean {
    if (this.inactiveProviders.has(name)) return false;
    const health = this.providerHealth.get(name);
    if (!health) return true;
    if (health.status === 'cooldown' && Date.now() > health.cooldownUntil) {
      health.status = 'available';
      health.consecutiveFailures = 0;
      return true;
    }
    return health.status === 'available';
  }

  private markFailure(name: string, error: any) {
    const health = this.providerHealth.get(name);
    if (!health) return;

    health.consecutiveFailures++;
    
    // Check for rate limit or quota errors
    const isRateLimit = error.message?.toLowerCase().includes('quota') || 
                        error.message?.toLowerCase().includes('rate limit') || 
                        error.message?.toLowerCase().includes('429') ||
                        error.message?.toLowerCase().includes('credits');

    if (isRateLimit || health.consecutiveFailures >= 3) {
      const cooldownMins = isRateLimit ? 5 : 2;
      console.warn(`[ROUTER] Provider ${name} entered cooldown for ${cooldownMins}m due to: ${error.message}`);
      health.status = 'cooldown';
      health.cooldownUntil = Date.now() + (1000 * 60 * cooldownMins);
    }
  }

  /**
   * Returns a Vercel AI SDK compatible provider.
   */
  getAIProvider(task: TaskType = 'chat') {
    const { provider: providerName, model } = this.getModelForTask(task);
    
    // If primary is in cooldown, try next in fallback order
    let finalProvider = providerName;
    let finalModel = model;

    if (!this.isAvailable(providerName)) {
      const fallback = this.fallbackOrder.find(p => this.isAvailable(p));
      if (fallback) {
        finalProvider = fallback;
        finalModel = undefined as any; // Use default for fallback
      }
    }

    if (finalProvider === 'ollama') {
      const ollama = createOpenAI({
        baseURL: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/v1`,
        apiKey: 'ollama',
      });
      return ollama(finalModel || process.env.OLLAMA_MODEL || 'qwen3:8b');
    }

    if (finalProvider === 'groq') {
      const groq = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      });
      return groq(finalModel || 'llama-3.3-70b-versatile');
    }

    // Default to Ollama
    const ollama = createOpenAI({
      baseURL: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/v1`,
      apiKey: 'ollama',
    });
    return ollama(finalModel || process.env.OLLAMA_MODEL || 'qwen3:8b');
  }

  private getProvider(name: string): LLMProvider | undefined {
    return this.providers.find(p => p.name === name);
  }

  private getModelForTask(task: TaskType): { provider: string, model: string } {
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3:8b';
    switch (task) {
      case 'simple': return { provider: 'ollama', model: ollamaModel };
      case 'chat': return { provider: 'ollama', model: ollamaModel };
      case 'planning': return { provider: 'ollama', model: ollamaModel };
      case 'research': return { provider: 'ollama', model: ollamaModel };
      case 'vision': return { provider: 'ollama', model: ollamaModel };
      default: return { provider: 'ollama', model: ollamaModel };
    }
  }

  async generate(task: TaskType, messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    const primary = this.getModelForTask(task);
    const order = [primary.provider, ...this.fallbackOrder.filter(p => p !== primary.provider)];

    let lastError: any;
    for (const providerName of order) {
      if (!this.isAvailable(providerName)) {
        console.log(`[ROUTER] Skipping ${providerName} (in cooldown)`);
        continue;
      }

      const provider = this.getProvider(providerName);
      if (!provider) continue;

      try {
        console.log(`[ROUTER] Attempting ${providerName} for ${task}...`);
        const model = providerName === primary.provider ? primary.model : undefined;
        
        const genOptions: any = { ...options };
        if (model) genOptions.model = model;
        
        // PHASE Z.4.2: Ollama Timeout
        if (providerName === 'ollama') {
          genOptions.timeout = 120000;
        }
        
        const result = await provider.generate(messages, genOptions);
        
        // Reset failures on success
        const health = this.providerHealth.get(providerName);
        if (health) health.consecutiveFailures = 0;
        
        return result;
      } catch (err: any) {
        console.warn(`[ROUTER] ${providerName} failed: ${err.message}`);
        this.markFailure(providerName, err);
        lastError = err;
      }
    }
    throw new Error(`All providers failed for task ${task}. Last error: ${lastError?.message}`);
  }

  async *stream(task: TaskType, messages: LLMMessage[], options?: any): AsyncIterable<string> {
    const primary = this.getModelForTask(task);
    const provider = this.getProvider(primary.provider);
    
    if (provider) {
      try {
        const stream = provider.stream(messages, { ...options, model: primary.model });
        for await (const chunk of stream) {
          yield chunk;
        }
        return;
      } catch (err) {
        console.warn(`[ROUTER] Primary provider ${primary.provider} failed for stream, falling back to generate...`);
      }
    }

    // If stream fails, we fallback to generate on other providers (not ideal for streaming but better than failing)
    const result = await this.generate(task, messages, options);
    yield result.content;
  }

  async embed(text: string): Promise<number[]> {
    // Special routing for embeddings - Ollama only for now
    const order = ['ollama'];
    for (const name of order) {
      const provider = this.getProvider(name);
      if (!provider) continue;
      try {
        return await provider.embed(text);
      } catch (err) {
        console.warn(`[ROUTER] Embedding provider ${name} failed.`);
      }
    }
    throw new Error('All embedding providers failed.');
  }

  async vision(messages: LLMMessage[], imageUrl: string, options?: any): Promise<LLMResponse> {
    return this.generate('vision', messages, { ...options, imageUrl });
  }
}

export const providerRouter = new ProviderRouter();
