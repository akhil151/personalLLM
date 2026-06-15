import { createClient } from '@/lib/supabase-server';
import { dbService } from '@/services/dbService';
import { memoryService } from '@/services/memory/memoryService';
import { llmService } from '@/services/llmService';
import { promptService } from '@/services/promptService';
import { observabilityService } from '@/services/observability/observabilityService';
import { executionPipeline } from '@/orchestrator/executionPipeline';
import { streamText, convertToModelMessages, UIMessage } from 'ai';

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

    const { messages: history, conversationId }: { messages: UIMessage[], conversationId: string } = await req.json();
    
    // In AI SDK 6, history contains UIMessages. We need the text of the last message.
    const lastMessagePart = history[history.length - 1].parts.find(p => p.type === 'text');
    const lastMessage = lastMessagePart?.type === 'text' ? lastMessagePart.text : '';

    // 1 & 2. UNIFIED PERSISTENCE CHAIN (Conversation -> Message -> Agent Run)
    const result = await dbService.initiateAutonomousRun(user.id, lastMessage, conversationId);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: 500 });
    }

    // 3. GENERATE FINAL RESPONSE BASED ON AGENT RUN
    const { data: steps } = await supabase
      .from('execution_steps')
      .select('*')
      .eq('run_id', result.runId)
      .order('created_at', { ascending: true });

    const summaryPrompt = `The following agents just completed a multi-step task for the user.
    Goal: ${lastMessage}
    Execution Steps: ${JSON.stringify(steps)}
    
    Provide a final, helpful response to the user summarizing the outcome and any actions taken.`;

    const result_stream = await streamText({
      model: llmService.getProvider('chat'),
      system: promptService.getSystemPrompt(),
      messages: [{ role: 'user', content: summaryPrompt }],
      onFinish: async ({ text }) => {
        const endTime = Date.now();
        await dbService.saveMessage(conversationId, 'assistant', text);
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

    return result_stream.toUIMessageStreamResponse();

  } catch (error: any) {
    console.error('Phase 4 Chat Error:', error);
    return new Response(error.message, { status: 500 });
  }
}
