import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { memoryService } from '@/services/memory/memoryService';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * MemoryAgent manages the cognitive context of the run.
 * 
 * WHY MEMORY MATTERS:
 * For an agent to be effective, it needs to know what has happened before.
 * This includes:
 * 1. Semantic retrieval of past conversations.
 * 2. Summarization of current run context.
 * 3. Shared state management (short-term memory).
 */
export class MemoryAgent implements IAgent {
  name = 'Memory Agent';
  role = 'memory' as const;

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { runId, userId, data, cos_context } = input;
    
    // Ensure we always have task and goal
    let task = data?.task;
    let goal = data?.goal;
    
    if (!task) {
      const fallbackTaskTitle = cos_context?.nextAction?.nextAction || 'Retrieve relevant memories';
      task = {
        title: fallbackTaskTitle,
        description: cos_context?.executiveBrief?.next_recommended_action || 'No task description available.',
        priority: 'medium'
      };
    }
    if (!goal) {
      goal = cos_context?.activeGoal?.title || cos_context?.executiveBrief?.goal_summary || 'Current user goal';
    }

    await orchestratorService.logStep(runId, this.name, 'thought', `Retrieving relevant memories for task: ${task.title}`);

    try {
      // 1. Determine if this is a storage or retrieval task
      const isStorage = task.title.toLowerCase().includes('store') || 
                        task.title.toLowerCase().includes('save') || 
                        task.description.toLowerCase().includes('store') || 
                        task.description.toLowerCase().includes('save');

      if (isStorage) {
        await orchestratorService.logStep(runId, this.name, 'thought', `Storing task result as a semantic memory.`);
        
        // Use the goal and task result as the content to store
        const contentToStore = `Goal: ${goal}\nFindings: ${JSON.stringify(data.fullContext || data.context || task.description)}`;
        
        // Create a message entry to link the embedding to
        const supabase = createAdminClient();
        const { data: msg } = await supabase.from('messages').insert([{
          conversation_id: input.conversationId,
          user_id: userId,
          role: 'assistant',
          content: contentToStore
        }]).select().single();

        if (msg) {
          await memoryService.storeMessageEmbedding(msg.id, input.conversationId, userId, contentToStore);
          await orchestratorService.logStep(runId, this.name, 'observation', `Successfully stored memory.`);
        }

        return {
          success: true,
          data: { stored: true, messageId: msg?.id },
          source: 'llm',
          fallback_used: false,
          execution_time: Date.now() - startTime
        };
      }

      // 2. Semantic Search in past messages (Default)
      const relevantMemories = await memoryService.searchSimilarMemories(task.title || goal, userId);
      
      const contextString = relevantMemories
        .map((m: any) => `[Historical Context]: ${m.content}`)
        .join('\n');

      await orchestratorService.logStep(runId, this.name, 'observation', `Found ${relevantMemories.length} relevant memories.`);

      return {
        success: true,
        data: {
          context: contextString,
          memories: relevantMemories
        },
        source: 'llm',
        fallback_used: false,
        execution_time: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'error',
        fallback_used: false,
        execution_time: Date.now() - startTime
      };
    }
  }
}

// Register the agent
agentRegistry.register(new MemoryAgent());
