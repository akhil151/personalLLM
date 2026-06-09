
import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse } from './LLMProvider';

export class OllamaProvider implements LLMProvider {
  name = 'ollama';
  private client: OpenAI;
  private model: string;

  constructor() {
    this.model = process.env.OLLAMA_MODEL || 'qwen3:8b';
    this.client = new OpenAI({
      baseURL: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/v1`,
      apiKey: 'ollama', // Ollama doesn't need an API key but the library might require one
    });
  }

  async generate(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    const requestStart = Date.now();
    let firstTokenTime = 0;

    try {
      // We use streaming even for generate to capture firstTokenTime
      const stream = await this.client.chat.completions.create({
        model: options?.model || this.model,
        messages,
        stream: true,
        ...options,
      });

      let content = '';
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
        }
        const delta = chunk.choices[0]?.delta?.content || '';
        content += delta;
      }

      const completionTime = Date.now();
      const totalMs = completionTime - requestStart;
      const firstTokenMs = firstTokenTime - requestStart;
      const completionMs = completionTime - firstTokenTime;

      // Ollama /v1/chat/completions might not return usage in stream easily depending on version
      // but we can estimate or use the non-stream if usage is critical.
      // For now, let's log the metrics as requested.

      console.log(`[OLLAMA_METRIC]
model: ${options?.model || this.model}
promptTokens: ${promptTokens} (est)
responseTokens: ${completionTokens} (est)
firstTokenMs: ${firstTokenMs}
completionMs: ${completionMs}
totalMs: ${totalMs}`);

      return {
        content,
        usage: {
          promptTokens,
          completionTokens,
        },
      };
    } catch (error) {
      console.error(`[OLLAMA_ERROR] ${error}`);
      throw error;
    }
  }

  async *stream(messages: LLMMessage[], options?: any): AsyncIterable<string> {
    const requestStart = Date.now();
    let firstTokenTime = 0;

    const stream = await this.client.chat.completions.create({
      model: options?.model || this.model,
      messages,
      stream: true,
      ...options,
    });

    for await (const chunk of stream) {
      if (!firstTokenTime) {
        firstTokenTime = Date.now();
        const firstTokenMs = firstTokenTime - requestStart;
        // console.log(`[OLLAMA_METRIC_STREAM] firstTokenMs: ${firstTokenMs}`);
      }
      yield chunk.choices[0]?.delta?.content || '';
    }

    const completionTime = Date.now();
    const totalMs = completionTime - requestStart;
    const firstTokenMs = firstTokenTime - requestStart;
    const completionMs = completionTime - (firstTokenTime || requestStart);

    console.log(`[OLLAMA_METRIC]
model: ${options?.model || this.model}
promptTokens: 0
responseTokens: 0
firstTokenMs: ${firstTokenMs}
completionMs: ${completionMs}
totalMs: ${totalMs}`);
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama Embedding Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  async vision(messages: LLMMessage[], imageUrl: string, options?: any): Promise<LLMResponse> {
    // Ollama supports vision with models like llava, but for now we'll just try to generate
    return this.generate(messages, options);
  }
}
