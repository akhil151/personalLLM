import { createClient } from '@/lib/supabase-server';
import { dbService } from '@/services/dbService';
import { memoryService } from '@/services/memory/memoryService';
import { openaiService } from '@/services/openaiService';
import { promptService } from '@/services/promptService';
import { observabilityService } from '@/services/observability/observabilityService';
import { executionPipeline } from '@/orchestrator/executionPipeline';
import '@/agents'; // Register agents
import { OpenAIStream, StreamingTextResponse } from 'ai';

/**
 * PHASE 5 AI CHAT ROUTE
 * Now evolves from simple Orchestration to Durable & Event-Driven Workflows.
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { message, conversationId } = await req.json();

    // 1. SAVE USER MESSAGE
    await dbService.saveMessage(conversationId, 'user', message);

    // 2. TRIGGER DURABLE WORKFLOW PIPELINE
    // This is the "Durable Execution" entry point.
    // The run is now checkpointed and can survive server restarts.
    const result = await executionPipeline.run(user.id, conversationId, message);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: 500 });
    }

    // 3. GENERATE FINAL RESPONSE BASED ON AGENT RUN
    // We fetch the execution steps to summarize what happened.
    const { data: steps } = await supabase
      .from('execution_steps')
      .select('*')
      .eq('run_id', result.runId)
      .order('created_at', { ascending: true });

    const summaryPrompt = `The following agents just completed a multi-step task for the user.
    Goal: ${message}
    Execution Steps: ${JSON.stringify(steps)}
    
    Provide a final, helpful response to the user summarizing the outcome and any actions taken.`;

    const response = await openaiService.getChatStream([
      { role: 'system', content: promptService.getSystemPrompt() },
      { role: 'user', content: summaryPrompt }
    ]);

    // 4. STREAMING & LOGGING
    const stream = OpenAIStream(response, {
      onCompletion: async (completion) => {
        const endTime = Date.now();
        await dbService.saveMessage(conversationId, 'assistant', completion);
        await observabilityService.logChatEvent({
          userId: user.id,
          conversationId,
          model: 'gpt-4o-agentic',
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: endTime - startTime,
        });
      },
    });

    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error('Phase 4 Chat Error:', error);
    return new Response(error.message, { status: 500 });
  }
}
