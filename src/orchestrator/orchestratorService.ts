import { createAdminClient } from '@/lib/supabase-admin';
import { agentRegistry, AgentRole } from './agentRegistry';
import { observabilityService } from '@/services/observability/observabilityService';
import { eventBus } from '@/events/eventBus';

/**
 * OrchestratorService is the central brain of the multi-agent system.
 * 
 * WHY A CENTRAL ORCHESTRATOR?
 * 1. Control: Prevents agents from looping infinitely.
 * 2. State Management: Maintains a single source of truth for the execution run.
 * 3. Routing: Ensures tasks are handled by the most qualified agent.
 * 4. Observability: Provides a central point for logging and tracing.
 */
export const orchestratorService = {
  /**
   * Starts a new autonomous agent run.
   */
  async startRun(userId: string, conversationId: string, goal: string) {
    const supabase = createAdminClient();

    // 1. Initialize the Run in DB
    const { data: run, error } = await supabase
      .from('agent_runs')
      .insert([{
        user_id: userId,
        conversation_id: conversationId,
        goal,
        status: 'running'
      }])
      .select()
      .single();

    if (error) throw error;

    // 2. Initial Step: Log the goal
    await this.logStep(run.id, 'orchestrator', 'thought', `Starting run for goal: ${goal}`);

    return run;
  },

  /**
   * Logs a granular step in the execution.
   */
  async logStep(
    runId: string, 
    agentName: string, 
    type: 'thought' | 'action' | 'observation' | 'reflection' | 'error',
    content: string,
    toolCall?: any,
    toolOutput?: any
  ) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('execution_steps')
      .insert([{
        run_id: runId,
        agent_name: agentName,
        step_type: type,
        content,
        tool_call: toolCall,
        tool_output: toolOutput
      }]);

    if (error) console.error('Error logging step:', error);
  },

  /**
   * Dispatches a task to a specific agent role.
   */
  async dispatch(role: AgentRole, input: any) {
    const agent = agentRegistry.getAgent(role);
    if (!agent) {
      throw new Error(`Agent for role ${role} not found in registry.`);
    }

    console.log(`Dispatching to ${agent.name}...`);
    return await agent.execute(input);
  },

  /**
   * Sends a message from one agent to another.
   */
  async sendAgentMessage(runId: string, sender: string, receiver: string, content: string, metadata: any = {}) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('agent_messages')
      .insert([{
        run_id: runId,
        sender_agent: sender,
        receiver_agent: receiver,
        content,
        metadata
      }]);

    if (error) console.error('Error sending agent message:', error);
    
    // Publish event for real-time listeners
    await eventBus.publish(runId, 'AGENT_MESSAGE_SENT', { sender, receiver, content });
  },

  /**
   * Updates the overall run status.
   */
  async updateRunStatus(runId: string, status: 'completed' | 'failed' | 'paused', metadata?: any) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('agent_runs')
      .update({ 
        status, 
        metadata,
        updated_at: new Date().toISOString() 
      })
      .eq('id', runId);

    if (error) console.error('Error updating run status:', error);
  }
};
