import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { llmService } from '@/services/llmService';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { createAdminClient } from '@/lib/supabase-admin';
import { z } from 'zod';

const PlannerSchema = z.object({
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.number(),
    assigned_agent: z.enum(['executor', 'memory', 'browser', 'research', 'critic'])
  }))
});

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
    
    if (!data || !data.goal) {
      throw new Error('Planner Agent: Missing "goal" in input data.');
    }
    
    const { goal } = data;

    await orchestratorService.logStep(runId, this.name, 'thought', `Decomposing goal: "${goal}" into tasks.`);

    const systemPrompt = `You are a Senior AI Planner. Your job is to take a high-level user goal and break it down into a sequence of logical tasks.
    Each task should be clear, actionable, and assigned to the most appropriate agent:
    - 'executor': for general system tasks or final data processing.
    - 'memory': for searching past conversations, retrieving long-term context, or knowledge base lookups.
    - 'browser': for any task that requires web navigation, searching the internet, or interacting with websites.
    - 'research': for deep-dive information gathering, synthesis of multiple sources, and complex report generation.
    - 'critic': for reviewing plans, checking outputs for accuracy, safety audits, or quality assurance.
    
    Task Decomposition Rules:
    1. If the goal requires finding new information on the web, use 'research' for the high-level inquiry and 'browser' for specific site visits.
    2. If the goal requires reviewing or validating work, always include a final 'critic' task.
    3. Use 'memory' first if the goal might rely on previous user interactions.
    4. Sequence tasks logically (e.g., research -> synthesize -> review).

    Return a JSON object with the following structure:
    {
      "tasks": [
        { "title": "...", "description": "...", "priority": 1, "assigned_agent": "executor|memory|browser|research|critic" }
      ]
    }`;

    try {
      const result = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Goal: ${goal}` }
      ], PlannerSchema);

      return await this.finalizePlan(runId, goal, result.tasks);

    } catch (error: any) {
      console.warn(`[PLANNER] LLM Planning failed, entering LEVEL 3 DETERMINISTIC FALLBACK: ${error.message}`);
      
      // LEVEL 3 DETERMINISTIC FALLBACK
      const fallbackTasks: any[] = [
        {
          title: "Initial Execution",
          description: `Execute core logic for: ${goal}`,
          priority: 1,
          assigned_agent: "executor" as const
        },
        {
          title: "Safety & Quality Review",
          description: "Final verification of fallback execution.",
          priority: 2,
          assigned_agent: "critic" as const
        }
      ];

      // If goal specifically mentions research or browser, inject those
      if (goal.toLowerCase().includes('research') || goal.toLowerCase().includes('find') || goal.toLowerCase().includes('search')) {
        fallbackTasks.unshift({
          title: "Emergency Research",
          description: `Gather critical info for: ${goal}`,
          priority: 0,
          assigned_agent: "research" as const
        });
      }

      return await this.finalizePlan(runId, goal, fallbackTasks);
    }
  }

  private async finalizePlan(runId: string, goal: string, tasks: any[]): Promise<AgentOutput> {
    // PHASE Z.3.5: Enforce Critic Agent review for high-complexity tasks
    const needsCritic = goal.toLowerCase().includes('research') || 
                        goal.toLowerCase().includes('report') || 
                        goal.toLowerCase().includes('code') || 
                        tasks.length > 3;

    if (needsCritic && !tasks.some((t: any) => t.assigned_agent === 'critic')) {
      console.log(`[PLANNER] High complexity detected. Injecting Critic Review task.`);
      tasks.push({
        title: "Quality Assurance & Accuracy Review",
        description: "Review all gathered information and generated outputs for accuracy, completeness, and safety.",
        priority: tasks.length + 1,
        assigned_agent: "critic"
      });
    }

    // Save tasks to DB
    const supabase = createAdminClient();
    const tasksToInsert = tasks.map((t: any, i: number) => ({
      run_id: runId,
      title: t.title,
      description: t.description,
      priority: t.priority !== undefined ? t.priority : i,
      assigned_agent: t.assigned_agent,
      status: 'pending'
    }));

    const { data: savedTasks, error } = await supabase
      .from('agent_tasks')
      .insert(tasksToInsert)
      .select();

    if (error) throw error;

    await orchestratorService.logStep(runId, this.name, 'observation', `Generated ${savedTasks.length} tasks.`);

    // PHASE Y.1 ACTIVATION: Notify Research Agent if needed
    if (goal.toLowerCase().includes('research')) {
      await orchestratorService.sendAgentMessage(
        runId, 
        this.name, 
        'Research Agent', 
        `Starting research tasks for goal: ${goal}`
      );
    }

    return {
      success: true,
      data: { tasks: savedTasks }
    };
  }
}

// Register the agent
agentRegistry.register(new PlannerAgent());
