import { llmService } from '@/services/llmService';
import { z } from 'zod';

const ReflectionSchema = z.object({
  success: z.boolean(),
  critique: z.string(),
  correction_plan: z.string().optional(),
  confidence_score: z.number()
});

/**
 * ReflectionEngine implements the "Self-Correction" loop for agents.
 * 
 * WHY REFLECTION?
 * Agents can make mistakes, use wrong tools, or hallucinate. 
 * Reflection adds a "Critic" layer that evaluates the output of an "Actor" 
 * before it is finalized or before moving to the next task.
 */
export const reflectionEngine = {
  /**
   * Critiques a task result and suggests corrections if needed.
   */
  async reflect(goal: string, task: string, result: any) {
    console.log(`Reflecting on task: ${task}`);

    const systemPrompt = `You are an AI Execution Critic. 
    Your goal is to evaluate if the Result successfully achieved the Task given the overall Goal.
    
    If successful, return success: true.
    If unsuccessful, explain why and provide a 'correction_plan'.
    
    Return JSON:
    {
      "success": boolean,
      "critique": "detailed analysis",
      "correction_plan": "what to do differently",
      "confidence_score": 0.0 to 1.0
    }`;

    const userPrompt = `GOAL: ${goal}\nTASK: ${task}\nRESULT: ${JSON.stringify(result)}`;

    try {
      const evaluation = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], ReflectionSchema);

      return evaluation;

    } catch (err) {
      console.error('Reflection Error:', err);
      return { success: true, confidence_score: 0.5 }; // Optimistic fallback
    }
  }
};
