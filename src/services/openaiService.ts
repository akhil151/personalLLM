import OpenAI from 'openai';
import { createOpenAI } from '@ai-sdk/openai';
import { routingService } from './analytics/routingService';
import { openaiResilience } from './openaiResilienceService';

/**
 * openaiService handles direct communication with the LLM.
 * 
 * PHASE Y.1 ACTIVATION:
 * Now integrated with routingService for model selection 
 * and cost/token tracking.
 * 
 * PHASE Y.4 ENHANCEMENT:
 * Wrapped with openaiResilience for operational reliability.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const aiSdkOpenAI = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openaiService = {
  /**
   * Returns the AI SDK provider instance with routed model.
   */
  async getProvider(complexity: 'low' | 'medium' | 'high' = 'medium') {
    const model = await routingService.getModelForTask(complexity);
    return aiSdkOpenAI(model);
  },

  /**
   * Generates a streaming response from OpenAI with tracking.
   */
  async getChatStream(messages: any[], userId: string, runId: string, complexity: 'low' | 'medium' | 'high' = 'medium') {
    const model = await routingService.getModelForTask(complexity);
    
    return openaiResilience.execute(async () => {
      const response = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
      });
      return response;
    });
  },

  /**
   * Generates a structured JSON output with model routing and usage tracking.
   */
  async getStructuredOutput(
    messages: any[], 
    jsonSchema: any, 
    userId: string = 'system', 
    runId: string = 'none',
    complexity: 'low' | 'medium' | 'high' = 'high'
  ) {
    const model = await routingService.getModelForTask(complexity);
    
    const response = await openaiResilience.execute(async () => {
      return await openai.chat.completions.create({
        model,
        messages,
        response_format: { type: 'json_object' },
      });
    });

    const content = response.choices[0].message.content;
    const usage = response.usage;

    if (!content) throw new Error('OpenAI returned empty content');

    // TRACK USAGE (MOCK ELIMINATED)
    if (usage) {
      await routingService.trackUsage(
        userId, 
        runId, 
        model, 
        usage.prompt_tokens, 
        usage.completion_tokens
      );
    }
    
    return JSON.parse(content);
  },

  /**
   * Generates a structured response from an image using vision capabilities.
   */
  async analyzeImage(imageUrl: string, systemPrompt: string, userPrompt: string, userId: string, runId: string) {
    const model = 'gpt-4o'; // Vision always uses 4o
    
    const response = await openaiResilience.execute(async () => {
      return await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });
    });

    const content = response.choices[0].message.content;
    const usage = response.usage;

    if (!content) throw new Error('OpenAI returned empty content');

    if (usage) {
      await routingService.trackUsage(userId, runId, model, usage.prompt_tokens, usage.completion_tokens);
    }
    
    return JSON.parse(content);
  }
};
