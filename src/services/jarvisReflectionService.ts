import { createAdminClient } from '@/lib/supabase-admin';
import { llmService } from './llmService';
import { userMemoryExtractor } from './userMemoryExtractor';
import { z } from 'zod';

const reflectionSchema = z.object({
  what_happened: z.string(),
  what_succeeded: z.string(),
  what_failed: z.string(),
  next_steps: z.string()
});

/**
 * JarvisReflectionService analyzes completed agent runs to provide insights.
 */
export const jarvisReflectionService = {
  async _getSupabase() {
    if (typeof window === 'undefined') {
      try {
        const { createClient } = await import('@/lib/supabase-server');
        return await createClient();
      } catch (err) {
        return createAdminClient();
      }
    } else {
      const { createClient } = await import('@/lib/supabase');
      return createClient();
    }
  },

  /**
   * Generates a reflection for a completed agent run.
   */
  async generateReflection(runId: string) {
    const supabase = await this._getSupabase();
    
    // 1. Fetch Run and Steps
    const { data: run } = await supabase.from('agent_runs').select('*').eq('id', runId).single();
    const { data: steps } = await supabase.from('execution_steps').select('*').eq('run_id', runId).order('created_at', { ascending: true });

    if (!run || !steps) throw new Error('Run or steps not found for reflection');

    // 2. Prepare Context for LLM
    const context = {
      goal: run.goal,
      status: run.status,
      steps: steps.map((s: any) => ({
        type: s.step_type,
        content: s.content,
        tool: (s.tool_call as any)?.name,
        output: s.tool_output
      }))
    };

    const systemPrompt = `You are Jarvis, a proactive AI assistant. 
    Analyze the following agent execution run and provide a reflection.
    
    Structure your response as JSON:
    {
      "what_happened": "Short summary of the run",
      "what_succeeded": "What went well",
      "what_failed": "What errors or obstacles occurred",
      "next_steps": "Recommended actions to take now"
    }`;

    try {
      const reflection = await llmService.getStructuredOutput(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this run: ${JSON.stringify(context)}` }
        ], 
        reflectionSchema,
        run.user_id, 
        run.id
      );

      // 3. Store Reflection
      const { data, error } = await supabase
        .from('jarvis_reflections')
        .insert([{
          user_id: run.user_id,
          run_id: run.id,
          ...reflection
        }])
        .select()
        .single();

      if (error) throw error;

      // PHASE Z.3 TRIGGER: Update personal profile after reflection
      await userMemoryExtractor.extractAndStoreProfile(run.user_id);

      return data;

    } catch (error: any) {
      console.error('Failed to generate reflection, using fallback:', error);
      
      const fallbackReflection = {
        what_happened: "Reflection generation failed",
        what_succeeded: "Workflow completed",
        what_failed: `Reflection parser failure: ${error.message}`,
        next_steps: "Review system logs for LLM parsing issues"
      };

      const { data } = await supabase
        .from('jarvis_reflections')
        .insert([{
          user_id: run.user_id,
          run_id: run.id,
          ...fallbackReflection
        }])
        .select()
        .single();

      return data;
    }
  },

  async getLatestReflections(limit = 5) {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('jarvis_reflections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};
