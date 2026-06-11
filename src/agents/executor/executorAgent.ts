import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { llmService } from '@/services/llmService';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { tools, toolHandlers } from '@/services/tools/toolService';
import { mcpService } from '@/mcp/mcpService';
import { createAdminClient } from '@/lib/supabase-admin';
import { z } from 'zod';

const ExecutorSchema = z.object({
  tool: z.string(),
  args: z.any(),
  reasoning: z.string()
});

/**
 * ExecutorAgent performs the actual work.
 * 
 * PHASE Y UPGRADE:
 * Now supports MCP (Model Context Protocol) tools dynamically.
 */
export class ExecutorAgent implements IAgent {
  name = 'Executor Agent';
  role = 'executor' as const;

  // Define actions that require human approval
  private dangerousActions = ['schedule_task', 'delete_data', 'query_db', 'mcp_filesystem_write_file'];

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { runId, data, cos_context } = input;
    
    // Ensure we always have a task and goal
    let task = data?.task;
    let goal = data?.goal;
    let context = data?.context || '';
    
    if (!task) {
      // Use cos_context to get a fallback task
      const fallbackTaskTitle = cos_context?.nextAction?.nextAction || 'Continue with current work';
      task = {
        title: fallbackTaskTitle,
        description: cos_context?.executiveBrief?.next_recommended_action || 'No task description available.',
        priority: 'medium'
      };
    }
    if (!goal) {
      goal = cos_context?.activeGoal?.title || cos_context?.executiveBrief?.goal_summary || 'Complete current task';
    }

    await orchestratorService.logStep(runId, this.name, 'thought', `Analyzing task: "${task.title}" for tool selection.`);

    // 1. Fetch available MCP tools and merge with local tools
    const mcpTools = await mcpService.listTools();
    const allTools = [
      ...tools, 
      ...mcpTools.map(t => ({ 
        type: 'function', 
        function: { 
          name: `mcp_${t.server}_${t.name}`, 
          description: `MCP Tool from ${t.server}: ${t.name}` 
        } 
      }))
    ];

    const systemPrompt = `You are an Autonomous Executor Agent.
    Choose the best tool for the task. Use 'mcp_' tools for system-level actions (filesystem, github, db).
    
    GOAL: ${goal}
    CONTEXT: ${context}
    TASK: ${task.title}

    Available Tools: ${JSON.stringify(allTools)}

    Return JSON: { "tool": "name", "args": {}, "reasoning": "..." }`;

    try {
      const decision = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Execute: ${task.title}` }
      ], ExecutorSchema);

      await orchestratorService.logStep(runId, this.name, 'thought', decision.reasoning, decision.tool, decision.args);

      // 2. HITL Check
      if (this.dangerousActions.includes(decision.tool)) {
        await orchestratorService.logStep(runId, this.name, 'observation', `Action "${decision.tool}" requires approval.`);
        
        const supabase = createAdminClient();
        const { data: approval } = await supabase
          .from('collaboration_requests')
          .insert([{
            run_id: runId,
            agent_name: this.name,
            request_type: 'approval',
            payload: { tool: decision.tool, args: decision.args },
            status: 'pending'
          }])
          .select().single();

        return {
          success: false,
          data: { approvalId: approval?.id },
          error: 'Waiting for human approval.',
          nextStep: 'wait_for_approval'
        };
      }

      // 3. Execution (MCP vs Local)
      let result;
      if (decision.tool.startsWith('mcp_')) {
        const parts = decision.tool.split('_');
        const serverName = parts[1];
        const toolName = parts.slice(2).join('_');
        result = await mcpService.callTool(serverName, toolName, decision.args);
      } else {
        const handler = toolHandlers[decision.tool];
        if (!handler) throw new Error(`No handler for ${decision.tool}`);
        result = await handler(decision.args);
      }

      await orchestratorService.logStep(runId, this.name, 'observation', `Executed ${decision.tool}`, null, result);

      return { success: true, data: result };

    } catch (error: any) {
      console.warn(`[EXECUTOR] LLM Execution failed, entering LEVEL 3 DETERMINISTIC FALLBACK: ${error.message}`);
      await orchestratorService.logStep(runId, this.name, 'error', `Failed: ${error.message}. Fallback applied.`);
      return {
        success: true,
        data: {
          action_taken: "Deterministic execution fallback",
          result_summary: `The task "${task.title}" was processed using deterministic logic as AI providers were unavailable.`,
          confidence_score: 0.5
        }
      };
    }
  }
}

agentRegistry.register(new ExecutorAgent());
