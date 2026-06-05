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
   * Ensures the lease is cleared and state is persisted atomically.
   */
  async checkpoint(sm: WorkflowStateMachine) {
    const supabase = createAdminClient();
    const context = sm.getContext();
    const now = new Date().toISOString();

    // 1. Save Snapshot (Durable State)
    const { error: snapError } = await supabase
      .from('workflow_snapshots')
      .insert([{
        run_id: context.runId,
        state_data: context.variables,
        step_index: context.stepIndex
      }]);

    if (snapError) throw new Error(`Checkpoint failed: ${snapError.message}`);

    // 2. Update Run Record in agent_runs and RELEASE LEASE
    const { error: runError } = await supabase
      .from('agent_runs')
      .update({
        status: sm.getState() as any,
        metadata: { ...context.variables },
        lease_owner: null,      // Release ownership
        lease_expires_at: null, // Clear expiry
        updated_at: now
      })
      .eq('id', context.runId);

    if (runError) throw new Error(`Failed to update run status: ${runError.message}`);
  },

  /**
   * Recovers a workflow from its last snapshot.
   * Implementation is idempotent: multiple calls return the same rehydrated state.
   */
  async recover(runId: string) {
    const supabase = createAdminClient();

    // 1. Get the latest snapshot and run record in parallel for consistency
    const [snapResult, runResult] = await Promise.all([
      supabase
        .from('workflow_snapshots')
        .select('*')
        .eq('run_id', runId)
        .order('step_index', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('agent_runs')
        .select('*')
        .eq('id', runId)
        .single()
    ]);

    if (snapResult.error) throw new Error(`Recovery failed: Snapshot not found for ${runId}`);
    if (runResult.error) throw new Error(`Recovery failed: Run ${runId} not found`);

    const snapshot = snapResult.data;
    const run = runResult.data;

    // 2. Reconstruct Context from source of truth
    const context: WorkflowContext = {
      runId: run.id,
      userId: run.user_id,
      conversationId: run.conversation_id,
      variables: snapshot.state_data,
      stepIndex: snapshot.step_index
    };

    const sm = new WorkflowStateMachine(context);
    
    // Only transition if not already in a terminal/recovered state
    if (run.status !== 'completed' && run.status !== 'failed') {
      sm.transitionTo('recovered');
      // Update status to 'recovered' but DO NOT clear lease yet if this is part of a recovery claim
      // Actually, scanAndRecover handles the lease. 
      // We update the run status so other parts of the system know it's being handled.
      await supabase.from('agent_runs').update({ 
        status: 'recovered',
        updated_at: new Date().toISOString()
      }).eq('id', runId);
    }
    
    return sm;
  }
};
