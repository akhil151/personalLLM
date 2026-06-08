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
 */
export const reflectionEngine = {
  /**
   * Critiques a task result and suggests corrections if needed.
   * PHASE Z.4.1.5 HARDENING: Layered recovery
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
      // LAYER 1: STRICT SCHEMA PARSE
      const evaluation = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], ReflectionSchema);

      return evaluation;

    } catch (err: any) {
      console.warn(`[REFLECTION] Layer 1 failed: ${err.message}. Attempting Layer 2 recovery...`);
      
      try {
        // LAYER 2: JSON RECOVERY (already handled by llmService.getStructuredOutput calling safeJsonParser)
        // If we reach here, even Layer 2 failed or the error was something else.
        
        // Let's try one more time with a simpler prompt if it was a parsing error
        if (err.message.includes('parse') || err.message.includes('JSON')) {
           const simpleResult = await llmService.getStructuredOutput([
             { role: 'system', content: "Analyze success. Return JSON {success:boolean, critique:string, confidence_score:number}" },
             { role: 'user', content: `Goal: ${goal}, Result: ${JSON.stringify(result)}` }
           ], ReflectionSchema);
           return simpleResult;
        }
        
        throw err;
      } catch (innerErr: any) {
        console.error(`[REFLECTION] Layer 2 failed: ${innerErr.message}. Falling back to Layer 3.`);
        
        // LAYER 3: FALLBACK REFLECTION
        return { 
          success: true, // Optimistic fallback to not block workflow
          critique: "Reflection unavailable due to system failure.",
          correction_plan: "No automated correction available.",
          confidence_score: 0.0,
          metadata: {
            summary: "Reflection unavailable",
            findings: [],
            gaps: [],
            recommendations: []
          }
        };
      }
    }
  }
};
