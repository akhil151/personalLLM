
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  generate(messages: LLMMessage[], options?: any): Promise<LLMResponse>;
  stream(messages: LLMMessage[], options?: any): AsyncIterable<string>;
  embed(text: string): Promise<number[]>;
  vision(messages: LLMMessage[], imageUrl: string, options?: any): Promise<LLMResponse>;
}
