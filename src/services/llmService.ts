
import { providerRouter, TaskType } from '../providers/providerRouter';
import { routingService } from './analytics/routingService';
import { safeJsonParser } from '../lib/safeJsonParser';
import { ZodSchema, z } from 'zod';

/**
 * Utility to check if an object is a Zod schema.
 */
function isZodSchema(schema: any): schema is ZodSchema {
  return schema && typeof schema.safeParse === 'function';
}

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
  async getStructuredOutput<T = any>(
    messages: any[], 
    jsonSchema?: ZodSchema<T>, 
    userId: string = 'system', 
    runId: string = 'none',
    task: TaskType = 'planning'
  ): Promise<T> {
    // ENFORCE ZOD SCHEMA
    if (jsonSchema && !isZodSchema(jsonSchema)) {
      throw new Error(`[LLM_SERVICE] Invalid schema passed to getStructuredOutput. Expected ZodSchema, got ${typeof jsonSchema}.`);
    }

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
    
    const parseResult = safeJsonParser.parse<T>(result.content, jsonSchema);
    
    if (!parseResult.success) {
      console.error(`[LLM_SERVICE] Structured output parsing failed: ${parseResult.error}`);
      throw new Error(parseResult.error);
    }

    if (parseResult.recovered) {
      console.log(`[LLM_SERVICE] Successfully recovered malformed JSON from ${task} task.`);
    }

    return parseResult.data!;
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
