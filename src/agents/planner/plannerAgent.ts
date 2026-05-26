import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { openaiService } from '@/services/openaiService';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { createClient } from '@/lib/supabase-server';

/**
 * PlannerAgent is responsible for task decomposition.
 * 
 * WHY PLANNING MATTERS:
 * LLMs often struggle with complex, multi-step goals if asked to do them all at once.
 * By breaking a goal into smaller, discrete tasks, we:
 * 1. Reduce hallucinations.
 * 2. Allow for granular error recovery.
 * 3. Provide better visibility into the AI's "thinking" process.
 */
export class PlannerAgent implements IAgent {
  name = 'Planner Agent';
  role = 'planner' as const;

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { runId, data } = input;
    const { goal } = data;

    await orchestratorService.logStep(runId, this.name, 'thought', `Decomposing goal: "${goal}" into tasks.`);

    const systemPrompt = `You are a Senior AI Planner. Your job is to take a high-level user goal and break it down into a sequence of logical tasks.
    Each task should be clear, actionable, and assigned to either an 'executor' (for tools/actions) or 'memory' (for retrieval/context).
    
    Return a JSON object with the following structure:
    {
      "tasks": [
        { "title": "...", "description": "...", "priority": 1, "assigned_agent": "executor|memory" }
      ]
    }`;

    try {
      const result = await openaiService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Goal: ${goal}` }
      ], {});

      // Save tasks to DB
      const supabase = await createClient();
      const tasksToInsert = result.tasks.map((t: any) => ({
        run_id: runId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        assigned_agent: t.assigned_agent,
        status: 'pending'
      }));

      const { data: savedTasks, error } = await supabase
        .from('agent_tasks')
        .insert(tasksToInsert)
        .select();

      if (error) throw error;

      await orchestratorService.logStep(runId, this.name, 'observation', `Generated ${savedTasks.length} tasks.`);

      return {
        success: true,
        data: { tasks: savedTasks }
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
agentRegistry.register(new PlannerAgent());
