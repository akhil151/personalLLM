import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { openaiService } from '@/services/openaiService';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { tools, toolHandlers } from '@/services/tools/toolService';
import { createClient } from '@/lib/supabase-server';

/**
 * ExecutorAgent performs the actual work.
 * 
 * RESPONSIBILITIES:
 * 1. Tool Selection: Decides which tool to use for a given task.
 * 2. Execution: Runs the tool and handles results.
 * 3. HITL (Human-in-the-loop): Requests approval for sensitive actions.
 * 4. Validation: Ensures the output meets the task requirements.
 */
export class ExecutorAgent implements IAgent {
  name = 'Executor Agent';
  role = 'executor' as const;

  // Define actions that require human approval
  private dangerousActions = ['schedule_task', 'delete_data'];

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { runId, data } = input;
    const { task, context, goal } = data;

    await orchestratorService.logStep(runId, this.name, 'thought', `Analyzing task: "${task.title}" to determine required tools.`);

    const systemPrompt = `You are an Autonomous Executor Agent.
    Based on the Task, Context, and Goal, choose the most appropriate tool to execute.
    
    GOAL: ${goal}
    CONTEXT: ${context}
    TASK: ${task.title} - ${task.description}

    Available Tools: ${JSON.stringify(tools)}

    Return a JSON object:
    {
      "tool": "name_of_tool",
      "args": { ... },
      "reasoning": "why this tool was chosen"
    }`;

    try {
      // 1. Decide on the tool
      const decision = await openaiService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Execute task: ${task.title}` }
      ], {});

      await orchestratorService.logStep(runId, this.name, 'thought', decision.reasoning, decision.tool, decision.args);

      // 2. HITL Check
      if (this.dangerousActions.includes(decision.tool)) {
        await orchestratorService.logStep(runId, this.name, 'observation', `Action "${decision.tool}" requires human approval.`);
        
        const supabase = await createClient();
        const { data: approval, error } = await supabase
          .from('approval_requests')
          .insert([{
            run_id: runId,
            action_type: decision.tool,
            action_data: decision.args,
            status: 'pending',
            requester_agent: this.name
          }])
          .select()
          .single();

        if (error) throw error;

        // In a real app, we would pause here and wait for a webhook or polling.
        // For this demo, we'll return a 'paused' state.
        return {
          success: false,
          data: { approvalId: approval.id },
          error: 'Waiting for human approval.',
          nextStep: 'wait_for_approval'
        };
      }

      // 3. Execute the tool
      const handler = toolHandlers[decision.tool];
      if (!handler) throw new Error(`No handler found for tool: ${decision.tool}`);

      const result = await handler(decision.args);

      await orchestratorService.logStep(runId, this.name, 'observation', `Tool ${decision.tool} executed successfully.`, null, result);

      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      await orchestratorService.logStep(runId, this.name, 'error', `Execution failed: ${error.message}`);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}

// Register the agent
agentRegistry.register(new ExecutorAgent());
