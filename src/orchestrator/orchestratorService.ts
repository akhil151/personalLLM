import { createAdminClient } from '@/lib/supabase-admin';
import { agentRegistry, AgentRole } from './agentRegistry';
import { observabilityService } from '@/services/observability/observabilityService';
import { eventBus } from '@/events/eventBus';
import { projectStateService } from '@/services/projectStateService';
import { goalManagerService } from '@/services/goalManagerService';
import { jarvisRecommendationService } from '@/services/jarvisRecommendationService';
import { priorityEngine } from '@/services/priorityEngine';
import { blockerDetectionService } from '@/services/blockerDetectionService';
import { jarvisService } from '@/services/jarvisService';
import { CosContextSchema } from '@/types/schemas';

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

    // 1.5 PHASE Z.3.5: Ensure Project and Goal exist for this run
    try {
      const activeProject = await projectStateService.getActiveProject(userId);
      if (!activeProject) {
        console.log(`[ORCHESTRATOR] No active project found. Creating project for goal: ${goal}`);
        const newProject = await supabase.from('user_projects').insert([{
          user_id: userId,
          title: goal.slice(0, 50),
          description: goal,
          status: 'active',
          health_state: 'green'
        }]).select().single();
        
        if (newProject.data) {
          await supabase.from('user_goals').insert([{
            user_id: userId,
            title: goal,
            description: `Primary goal for project ${newProject.data.title}`,
            status: 'active',
            progress_percentage: 0
          }]);
        }
      }
    } catch (err) {
      console.error('[ORCHESTRATOR] Failed to bootstrap project/goal:', err);
    }

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
   * PHASE Z.4.3: Injects Chief of Staff context before execution.
   */
  async dispatch(role: AgentRole, input: any) {
    const agent = agentRegistry.getAgent(role);
    if (!agent) {
      throw new Error(`Agent for role ${role} not found in registry.`);
    }

    // 1. Context Awareness Injection (STRICT CONTRACT)
    try {
      if (input.userId) {
        const [goals, projects, nextAction, blockers, brief] = await Promise.all([
          createAdminClient().from('user_goals').select('*').eq('user_id', input.userId).eq('status', 'active'),
          createAdminClient().from('user_projects').select('*, milestones:project_milestones(*)').eq('user_id', input.userId).eq('status', 'active'),
          priorityEngine.determineNextAction(input.userId),
          blockerDetectionService.detectBlockers(input.userId),
          jarvisService.generateExecutiveBrief(input.userId)
        ]);

        // Augment input with Chief of Staff intelligence with strict defaults
        const rawContext = {
          activeGoal: goals.data?.[0] || null,
          activeProject: projects.data?.[0] || null,
          currentMilestone: projects.data?.[0]?.milestones?.find((m: any) => m.status === 'in_progress') || null,
          nextAction: nextAction,
          activeBlockers: blockers,
          executiveBrief: brief
        };
        
        // Validate and populate defaults using schema
        const validation = CosContextSchema.safeParse(rawContext);
        input.cos_context = validation.success ? validation.data : CosContextSchema.parse({});
      }
    } catch (err) {
      console.warn('[ORCHESTRATOR] Failed to inject CoS context, using defaults:', err);
      input.cos_context = CosContextSchema.parse({});
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
  },

  /**
   * Logs a voice session entry.
   */
  async logVoiceSession(userId: string, conversationId: string, status: 'active' | 'completed' | 'interrupted', config: any = {}) {
    const supabase = createAdminClient();
    
    // UUID VALIDATION: Fix for "Voice UUID Bug"
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let validConversationId = conversationId;

    if (!uuidRegex.test(conversationId)) {
      console.warn(`[ORCHESTRATOR] Invalid UUID for voice session: ${conversationId}. Fetching/Creating default.`);
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single();
      
      if (conv) {
        validConversationId = conv.id;
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert([{ user_id: userId, title: 'Voice Session Conversation' }])
          .select()
          .single();
        validConversationId = newConv.id;
      }
    }

    const { data, error } = await supabase
      .from('voice_sessions')
      .insert([{
        user_id: userId,
        conversation_id: validConversationId,
        status,
        session_config: config
      }])
      .select()
      .single();

    if (error) console.error('Error logging voice session:', error);
    return data;
  }
};
