import OpenAI from 'openai';

/**
 * openaiService handles direct communication with the LLM.
 * 
 * WHY THIS EXISTS:
 * It abstracts the specific provider (OpenAI) from the rest of the app.
 * If you want to switch to Anthropic or a local model later, 
 * you only change this file.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openaiService = {
  /**
   * Generates a streaming response from OpenAI.
   * 
   * INTERNAL FLOW:
   * 1. Receives system prompt + formatted history.
   * 2. Calls Chat Completions with stream: true.
   * 3. Returns a stream that the frontend can consume.
   */
  async getChatStream(messages: any[]) {
    return await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      stream: true,
    });
  },

  /**
   * Generates a structured JSON output using OpenAI's response_format.
   */
  async getStructuredOutput(messages: any[], jsonSchema: any) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('OpenAI returned empty content');
    
    return JSON.parse(content);
  }
};
