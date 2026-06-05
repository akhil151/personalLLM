
import { createOpenAI } from '@ai-sdk/openai';
import { LLMProvider, LLMMessage, LLMResponse } from './LLMProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { OpenRouterProvider } from './OpenRouterProvider';

export type TaskType = 'simple' | 'chat' | 'planning' | 'research' | 'vision';

export class ProviderRouter {
  private providers: LLMProvider[];
  private fallbackOrder: string[] = ['gemini', 'openrouter'];

  constructor() {
    this.providers = [
      new OpenAIProvider(),
      new GeminiProvider(),
      new OpenRouterProvider(),
    ];
  }

  /**
   * Returns a Vercel AI SDK compatible provider.
   */
  getAIProvider(task: TaskType = 'chat') {
    const { provider, model } = this.getModelForTask(task);
    
    if (provider === 'openai') {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return openai(model);
    }

    if (provider === 'openrouter') {
      const openrouter = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      return openrouter(model);
    }

    // Default to Gemini if something goes wrong (no OpenAI fallback)
    const gemini = createOpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY,
    });
    return gemini(model);
  }

  private getProvider(name: string): LLMProvider | undefined {
    return this.providers.find(p => p.name === name);
  }

  private getModelForTask(task: TaskType): { provider: string, model: string } {
    switch (task) {
      case 'simple': return { provider: 'openrouter', model: 'anthropic/claude-3-haiku' };
      case 'chat': return { provider: 'openrouter', model: 'anthropic/claude-3-haiku' };
      case 'planning': return { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' };
      case 'research': return { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' };
      case 'vision': return { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' };
      default: return { provider: 'openrouter', model: 'anthropic/claude-3-haiku' };
    }
  }

  async generate(task: TaskType, messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    const primary = this.getModelForTask(task);
    const order = [primary.provider, ...this.fallbackOrder.filter(p => p !== primary.provider)];

    let lastError: any;
    for (const providerName of order) {
      const provider = this.getProvider(providerName);
      if (!provider) continue;

      try {
        console.log(`[ROUTER] Attempting ${providerName} for ${task}...`);
        const model = providerName === primary.provider ? primary.model : undefined;
        return await provider.generate(messages, { ...options, model });
      } catch (err: any) {
        console.warn(`[ROUTER] ${providerName} failed: ${err.message}`);
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
        const stream = await provider.stream(messages, { ...options, model: primary.model });
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
    // Special routing for embeddings
    const order = ['gemini', 'openrouter'];
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
