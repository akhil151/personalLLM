import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { memoryService } from '@/services/memory/memoryService';
import { orchestratorService } from '@/orchestrator/orchestratorService';

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
    const { runId, userId, data } = input;
    const { task, goal } = data;

    await orchestratorService.logStep(runId, this.name, 'thought', `Retrieving relevant context for task: ${task.title}`);

    try {
      // 1. Semantic Search in past messages
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
        }
      };

    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}

// Register the agent
agentRegistry.register(new MemoryAgent());
