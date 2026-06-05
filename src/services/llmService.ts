
import { providerRouter, TaskType } from '../providers/providerRouter';
import { routingService } from './analytics/routingService';

/**
 * llmService handles direct communication with the LLM via provider abstraction.
 * 
 * PHASE Y.6 ACTIVATION:
 * Now provider-agnostic. Supports OpenAI, Gemini, and OpenRouter with fallback.
 */
export const llmService = {
  /**
   * Returns the AI SDK provider instance with routed model.
   */
  getProvider(task: TaskType = 'chat') {
    return providerRouter.getAIProvider(task);
  },

  /**
   * Generates a streaming response from the routed provider.
   */
  async getChatStream(messages: any[], userId: string, runId: string, task: TaskType = 'chat') {
    return providerRouter.stream(task, messages);
  },

  /**
   * Generates a structured JSON output with provider routing and usage tracking.
   */
  async getStructuredOutput(
    messages: any[], 
    jsonSchema: any, 
    userId: string = 'system', 
    runId: string = 'none',
    task: TaskType = 'planning'
  ) {
    const result = await providerRouter.generate(task, messages, {
      response_format: { type: 'json_object' }
    });

    // TRACK USAGE
    if (result.usage) {
      await routingService.trackUsage(
        userId, 
        runId, 
        'abstract-model', 
        result.usage.promptTokens, 
        result.usage.completionTokens
      );
    }
    
    return JSON.parse(result.content);
  },

  /**
   * Generates a structured response from an image using vision capabilities.
   */
  async analyzeImage(imageUrl: string, systemPrompt: string, userPrompt: string, userId: string, runId: string) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ] as any;
    
    const result = await providerRouter.vision(messages, imageUrl);
    return result.content;
  }
};

// Maintain backward compatibility for now
export const openaiService = llmService;
