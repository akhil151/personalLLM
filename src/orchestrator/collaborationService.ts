import { createAdminClient } from '@/lib/supabase-admin';
import { eventBus } from '@/events/eventBus';
import { workflowRuntime } from '@/runtime/workflowRuntime';

/**
 * CollaborationService handles Human-in-the-Loop (HITL) interactions.
 * 
 * PHASE Y.1 ACTIVATION:
 * Implements the "Resume" logic that automatically restarts a workflow
 * once a human has approved or responded to a collaboration request.
 */
export const collaborationService = {
  /**
   * Initializes the realtime listener for collaboration requests.
   */
  async initListener() {
    const supabase = createAdminClient();

    console.log("[COLLABORATION] Initializing HITL Resume listener...");

    supabase
      .channel('collaboration_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collaboration_requests',
          filter: 'status=in.("approved","completed")'
        },
        async (payload: any) => {
          const request = payload.new;
          console.log(`[COLLABORATION] Request ${request.id} ${request.status}. Resuming workflow ${request.run_id}`);

          // 1. Emit event for internal listeners
          await eventBus.publish(request.run_id, 'COLLABORATION_RESPONDED', {
            requestId: request.id,
            status: request.status,
            response: request.response
          });

          // 2. Trigger workflow resumption
          await this.resumeWorkflow(request.run_id, request.response);
        }
      )
      .subscribe();
  },

  /**
   * Resumes a paused workflow from its last checkpoint.
   */
  async resumeWorkflow(runId: string, humanResponse: any) {
    console.log(`[COLLABORATION] Restoring checkpoint for run ${runId}`);
    
    // 1. Load the state machine from the last snapshot
    const sm = await workflowRuntime.recover(runId);
    
    if (!sm) {
      console.error(`[COLLABORATION] Could not find snapshot for run ${runId}`);
      return;
    }

    // 2. Inject the human response into variables
    sm.updateVariables({ last_human_response: humanResponse });
    sm.transitionTo('running');

    // 3. Continue execution (this would typically re-trigger the event bus loop)
    await eventBus.publish(runId, 'PLAN_GENERATED', { 
      tasks: sm.getContext().variables.tasks,
      resumed: true 
    });
  }
};
