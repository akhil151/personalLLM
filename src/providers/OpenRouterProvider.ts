
import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse } from './LLMProvider';

export class OpenRouterProvider implements LLMProvider {
  name = 'openrouter';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://trae-ai-platform.com',
        'X-Title': 'Trae AI Platform',
      }
    });
  }

  async generate(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'anthropic/claude-3-sonnet',
      messages,
      ...options,
    });

    return {
      content: response.choices[0].message.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  async stream(messages: LLMMessage[], options?: any): Promise<AsyncIterable<string>> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || 'anthropic/claude-3-sonnet',
      messages,
      stream: true,
      ...options,
    }) as any;

    return (async function* () {
      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    })();
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-large',
        input: text,
        dimensions: 3072
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter Embedding Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async vision(messages: LLMMessage[], imageUrl: string, options?: any): Promise<LLMResponse> {
    return this.generate(messages, { ...options, model: 'google/gemini-flash-1.5-exp' });
  }
}
