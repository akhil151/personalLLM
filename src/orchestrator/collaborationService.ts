import { createAdminClient } from '@/lib/supabase-admin';
import { eventBus } from '@/events/eventBus';
import { workflowRuntime } from '@/runtime/workflowRuntime';
import { jobQueue } from '@/queue/jobQueue';

/**
 * CollaborationService handles Human-in-the-Loop (HITL) interactions.
 * 
 * PHASE P1:
 * - Validates ownership and task targeting
 * - Fixes resume logic to continue from current task instead of restarting all
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

          // 1. Validate the request
          if (!request.run_id) {
            console.error('[COLLABORATION] Invalid collaboration request: missing run_id');
            return;
          }

          // 2. Emit event for internal listeners
          await eventBus.publish(request.run_id, 'COLLABORATION_RESPONDED', {
            requestId: request.id,
            taskId: request.task_id,
            status: request.status,
            response: request.response
          });

          // 3. Trigger workflow resumption with full request
          await this.resumeWorkflow(request);
        }
      )
      .subscribe();
  },

  /**
   * Resumes a paused workflow from its last checkpoint.
   */
  async resumeWorkflow(request: any) {
    console.log(`[COLLABORATION] Restoring checkpoint for run ${request.run_id}`);
    
    const supabase = createAdminClient();

    // 1. Load the state machine from the last snapshot
    const sm = await workflowRuntime.recover(request.run_id);
    
    if (!sm) {
      console.error(`[COLLABORATION] Could not find snapshot for run ${request.run_id}`);
      return;
    }
    const context = sm.getContext();

    // 2. Validate workflow state
    if (request.user_id && context.userId !== request.user_id) {
      console.error(`[COLLABORATION] Ownership validation failed: request user ${request.user_id} != run user ${context.userId}`);
      return;
    }

    // 3. Get tasks to find the current index
    const tasks = context.variables.tasks || [];
    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.error(`[COLLABORATION] No tasks found in workflow ${request.run_id}`);
      return;
    }

    // 4. Find the index of the task that requested approval (or find first pending)
    let taskIndex = 0;
    let targetTask = null;

    if (request.task_id) {
      taskIndex = tasks.findIndex((t: any) => t.id === request.task_id);
      if (taskIndex === -1) {
        console.error(`[COLLABORATION] Task ${request.task_id} not found in workflow ${request.run_id}`);
        // Fallback: find first pending or in_progress task
        taskIndex = tasks.findIndex((t: any) => t.status === 'pending' || t.status === 'in_progress');
      }
    } else {
      // Fallback: find first pending or in_progress task
      taskIndex = tasks.findIndex((t: any) => t.status === 'pending' || t.status === 'in_progress');
    }

    if (taskIndex === -1) {
      // All tasks already processed - just mark workflow as completed
      console.log(`[COLLABORATION] All tasks already completed for run ${request.run_id}`);
      sm.transitionTo('completed');
      await workflowRuntime.checkpoint(sm);
      return;
    }

    targetTask = tasks[taskIndex];

    // 5. Get the actual task from DB (to make sure we have the latest version)
    const { data: dbTask } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', targetTask.id)
      .single();

    if (dbTask) {
      targetTask = dbTask;
    }

    // 6. Inject the human response into variables
    sm.updateVariables({ last_human_response: request.response });
    sm.transitionTo('running');

    // 7. Checkpoint the state
    await workflowRuntime.checkpoint(sm);

    // 8. Enqueue ONLY this task instead of restarting all!
    console.log(`[COLLABORATION] Enqueuing task ${taskIndex} (${targetTask.title}) for run ${request.run_id}`);
    await this.enqueueTaskForResume(request.run_id, targetTask, taskIndex, tasks.length, context.userId);
  },

  /**
   * Helper to enqueue a specific task for resume
   */
  async enqueueTaskForResume(runId: string, task: any, index: number, total: number, userId: string) {
    await eventBus.publish(runId, 'TASK_CREATED', { task, index, total });

    await jobQueue.enqueue(userId, 'task_execution' as any, {
      task,
      index,
      total,
      runId
    }, runId);
  }
};
