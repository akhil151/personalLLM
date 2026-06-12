
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
    if (process.env.USE_MOCK_LLM === 'true') {
      return {} as any;
    }
    return providerRouter.getAIProvider(task);
  },

  /**
   * Generates a streaming response from the routed provider.
   */
  async getChatStream(messages: any[], userId: string, runId: string, task: TaskType = 'chat') {
    if (process.env.USE_MOCK_LLM === 'true') {
      return async function*() { yield 'Mock response'; }();
    }
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

    if (process.env.USE_MOCK_LLM === 'true') {
      // Mock responses based on schema type
      console.log(`[LLM_SERVICE] Mocking structured output for task: ${task}`);
      
      // Let's check what keys are expected in jsonSchema to decide which mock to return
      let isGoalPlanSchema = false;
      let isExecutiveBriefSchema = false;
      let isRecommendationSchema = false;
      
      if (jsonSchema) {
        // Check if schema has "milestones" key (GoalPlanSchema)
        const shape = (jsonSchema as any).shape;
        if (shape) {
          if (shape.milestones) {
            isGoalPlanSchema = true;
          }
          if (shape.goal_summary) {
            isExecutiveBriefSchema = true;
          }
          if (shape.recommendations) {
            isRecommendationSchema = true;
          }
        }
      }
      
      console.log(`[LLM_SERVICE] Schema checks - goalPlan:${isGoalPlanSchema}, brief:${isExecutiveBriefSchema}, recs:${isRecommendationSchema}`);
      
      // Mock for GoalPlanSchema
      if (isGoalPlanSchema) {
        const mockGoalPlan = {
          milestones: [
            {
              title: 'Build Foundations',
              description: 'Learn the basics of machine learning',
              order_index: 0,
              priority: 'high',
              estimated_effort: 40,
              tasks: [
                { title: 'Complete ML 101 course', priority: 'high' },
                { title: 'Practice with toy datasets', priority: 'medium' }
              ]
            },
            {
              title: 'Develop Portfolio',
              description: 'Create projects to showcase skills',
              order_index: 1,
              priority: 'high',
              estimated_effort: 60,
              tasks: [
                { title: 'Build classification model', priority: 'high' },
                { title: 'Create a project README', priority: 'medium' }
              ]
            }
          ],
          priority: 'high',
          estimated_completion_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        };
        console.log('[LLM_SERVICE] Returning mock goal plan');
        return mockGoalPlan as T;
      }
      
      // Mock for ExecutiveBriefSchema
      if (isExecutiveBriefSchema) {
        const mockBrief = {
          goal_summary: 'User is working on getting an ML internship in 90 days.',
          progress_percentage: 5,
          active_projects_count: 1,
          completed_milestones_summary: 'No milestones completed yet.',
          blocked_items: [],
          highest_priority: 'Complete ML 101 course',
          priority_reason: 'Foundational knowledge is essential for an ML internship.',
          next_recommended_action: 'Start the ML 101 course today.'
        };
        console.log('[LLM_SERVICE] Returning mock executive brief');
        return mockBrief as T;
      }
      
      // Mock for RecommendationSchema
      if (isRecommendationSchema) {
        const mockRecs = {
          recommendations: [
            {
              title: 'Update LinkedIn Profile',
              reasoning: 'A strong LinkedIn profile is essential for internship applications.',
              impact: 'High Impact',
              urgency: 'high'
            },
            {
              title: 'Practice Technical Interviews',
              reasoning: 'Technical interviews are a key part of internship selection.',
              impact: 'High Impact',
              urgency: 'medium'
            }
          ]
        };
        console.log('[LLM_SERVICE] Returning mock recommendations');
        return mockRecs as T;
      }

      // Default mock
      console.log('[LLM_SERVICE] Returning empty mock');
      return {} as T;
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
    if (process.env.USE_MOCK_LLM === 'true') {
      return 'Mock image analysis result';
    }
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ] as any;
    
    const result = await providerRouter.vision(messages, imageUrl);
    return result.content;
  },
};

// Maintain backward compatibility for now
export const openaiService = llmService;
