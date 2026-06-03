import { createAdminClient } from '@/lib/supabase-admin';
import { WorkflowStateMachine, WorkflowContext } from './workflowStateMachine';

/**
 * WorkflowRuntime is the engine that executes durable workflows.
 * 
 * DURABLE EXECUTION CONCEPTS:
 * 1. Checkpointing: Saving the state of the workflow at every step.
 * 2. Rehydration: Loading a workflow from the database after a crash.
 * 3. Idempotency: Ensuring that repeating a step doesn't cause side effects.
 */
export const workflowRuntime = {
  /**
   * Starts or resumes a workflow.
   */
  async startWorkflow(userId: string, conversationId: string, type: string, initialVars: any = {}) {
    const supabase = createAdminClient();

    // 1. Create the Run record in agent_runs (Consolidated)
    const { data: run, error } = await supabase
      .from('agent_runs')
      .insert([{
        user_id: userId,
        conversation_id: conversationId,
        goal: initialVars.goal || 'Autonomous Run',
        status: 'running',
        metadata: { workflow_type: type, ...initialVars }
      }])
      .select()
      .single();

    if (error) throw error;

    const context: WorkflowContext = {
      runId: run.id,
      userId,
      conversationId,
      variables: initialVars,
      stepIndex: 0
    };

    return new WorkflowStateMachine(context);
  },

  /**
   * Saves a checkpoint of the workflow.
   */
  async checkpoint(sm: WorkflowStateMachine) {
    const supabase = createAdminClient();
    const context = sm.getContext();

    // 1. Save Snapshot (We still use snapshots for durable state)
    await supabase
      .from('workflow_snapshots')
      .insert([{
        workflow_run_id: context.runId,
        state_data: context.variables,
        step_index: context.stepIndex
      }]);

    // 2. Update Run Record in agent_runs
    await supabase
      .from('agent_runs')
      .update({
        status: sm.getState() as any,
        metadata: { ...context.variables },
        updated_at: new Date().toISOString()
      })
      .eq('id', context.runId);
  },

  /**
   * Recovers a workflow from its last snapshot.
   */
  async recover(runId: string) {
    const supabase = createAdminClient();

    // 1. Get the latest snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from('workflow_snapshots')
      .select('*')
      .eq('workflow_run_id', runId)
      .order('step_index', { ascending: false })
      .limit(1)
      .single();

    if (snapError) throw snapError;

    // 2. Get run details
    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError) throw runError;

    const context: WorkflowContext = {
      runId: run.id,
      userId: run.user_id,
      conversationId: run.conversation_id,
      variables: snapshot.state_data,
      stepIndex: snapshot.step_index
    };

    const sm = new WorkflowStateMachine(context);
    sm.transitionTo('recovered');
    
    // PERSIST RECOVERY STATUS
    await this.checkpoint(sm);
    
    return sm;
  }
};
