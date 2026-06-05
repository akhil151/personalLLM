
import { LLMProvider, LLMMessage, LLMResponse } from './LLMProvider';

export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  async generate(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    const model = options?.model || 'gemini-3.5-flash';
    const contents = messages.map(m => {
      // Gemini roles are 'user' and 'model'
      let role = m.role === 'assistant' ? 'model' : 'user';
      // System messages are handled differently in Gemini v1beta (via system_instruction)
      // but for simplicity we'll map them to user if the provider doesn't support them.
      // Actually, many providers treat system as user if not supported.
      if (m.role === 'system') role = 'user'; 
      
      return {
        role,
        parts: [{ text: m.content }]
      };
    });

    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;
    console.log(`[GEMINI] Fetching ${url}`);
    const body: any = {
      contents
    };

    if (options?.response_format?.type === 'json_object') {
      body.generationConfig = {
        responseMimeType: 'application/json'
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text || '',
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      }
    };
  }

  async stream(messages: LLMMessage[], options?: any): Promise<AsyncIterable<string>> {
    // Basic implementation for now
    const result = await this.generate(messages, options);
    return (async function* () {
      yield result.content;
    })();
  }

  async embed(text: string): Promise<number[]> {
    const model = 'gemini-embedding-2';
    const response = await fetch(`${this.baseUrl}/${model}:embedContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] }
      })
    });

    if (!response.ok) throw new Error('Gemini Embedding Error');
    const data = await response.json();
    return data.embedding.values;
  }

  async vision(messages: LLMMessage[], imageUrl: string, options?: any): Promise<LLMResponse> {
    // Gemini 1.5 Pro/Flash support vision
    return this.generate(messages, { ...options, model: 'gemini-3.5-flash' });
  }
}
