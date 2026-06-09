
import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse } from './LLMProvider';

export class GroqProvider implements LLMProvider {
  name = 'groq';
  private client: OpenAI;
  private model: string;

  constructor() {
    this.model = 'llama-3.3-70b-versatile';
    this.client = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async generate(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.model,
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

  async *stream(messages: LLMMessage[], options?: any): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || this.model,
      messages,
      ...options,
      stream: true,
    }) as any;

    for await (const chunk of stream) {
      yield chunk.choices[0]?.delta?.content || '';
    }
  }

  async embed(_text: string): Promise<number[]> {
    // Groq doesn't support embeddings directly yet in a standard way, 
    // usually people use other services. But for now we'll throw or use a default.
    throw new Error('Groq does not support embeddings.');
  }

  async vision(messages: LLMMessage[], _imageUrl: string, options?: any): Promise<LLMResponse> {
    // Groq has some vision models but let's stick to the requested model
    return this.generate(messages, options);
  }
}
