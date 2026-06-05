
import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse } from './LLMProvider';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generate(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4o',
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
      model: options?.model || 'gpt-4o',
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
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async vision(messages: LLMMessage[], imageUrl: string, options?: any): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        ...messages,
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this image.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        } as any,
      ],
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
}
