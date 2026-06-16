import { createAdminClient } from '@/lib/supabase-admin';
import { workflowRuntime } from '@/runtime/workflowRuntime';
import { eventBus } from '@/events/eventBus';
import { jobQueue } from '@/queue/jobQueue';

const LEASE_DURATION_MS = 60000; // 1 minute lease

/**
 * SchedulerService enables proactive autonomous behavior.
 * 
 * PHASE P2 ENHANCEMENTS:
 * - Proper lease-based claiming to prevent duplicate execution
 * - Explicit failure states with logging
 * - Idempotency safeguards
 * - Structured observability
 */
export const schedulerService = {
  /**
   * Schedules a new autonomous task.
   */
  async scheduleTask(userId: string, name: string, nextRun: Date, type: string, payload: any = {}) {
    const supabase = createAdminClient();
    console.log(`[SCHEDULER] Creating schedule: ${name} for user ${userId}`);

    const { data, error } = await supabase
      .from('autonomous_schedules')
      .insert([{
        user_id: userId,
        name,
        next_run_at: nextRun.toISOString(),
        workflow_type: type,
        payload,
        status: 'active'
      }])
      .select()
      .single();

    if (error) {
      console.error(`[SCHEDULER] Failed to create schedule:`, error);
      throw error;
    }
    
    console.log(`[SCHEDULER] Schedule created with ID: ${data.id}`);
    return data;
  },

  /**
   * Scans for due tasks and executes them.
   * Uses atomic lease-based claiming to ensure a task is only started once.
   */
  async processSchedules(workerId: string = 'scheduler-worker') {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const leaseExpiresAt = new Date(Date.now() + LEASE_DURATION_MS).toISOString();

    console.log(`[SCHEDULER] Worker ${workerId} scanning for due schedules at ${now}`);

    // 1. Atomically claim one due task using lease
    const { data: task, error } = await supabase
      .from('autonomous_schedules')
      .update({ 
        status: 'processing',
        lease_owner: workerId,
        lease_expires_at: leaseExpiresAt,
        updated_at: now
      })
      .eq('status', 'active')
      .lte('next_run_at', now)
      .is('lease_owner', null)
      .select()
      .limit(1)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[SCHEDULER] Schedule scan/claim error:', error);
      }
      return;
    }

    if (!task) {
      console.log(`[SCHEDULER] No due schedules found for worker ${workerId}`);
      return;
    }

    console.log(`[SCHEDULER] Worker ${workerId} claimed schedule: ${task.id} (${task.name})`);

    try {
      await eventBus.publish(task.id, 'SCHEDULE_EXECUTION_STARTED', { 
        scheduleId: task.id, 
        userId: task.user_id, 
        workerId 
      });

      // 2. Trigger the workflow via background job (not directly)
      // Use jobQueue so it can survive process restarts
      await jobQueue.enqueue(task.user_id, 'schedule_workflow' as any, {
        scheduleId: task.id,
        workflowType: task.workflow_type,
        payload: task.payload
      }, task.id);

      // 3. Update schedule
      const updateData: any = {
        last_run_at: now,
        updated_at: now
      };

      if (task.cron_expression) {
        // Calculate next run (simplified 24h for now)
        updateData.status = 'active';
        updateData.next_run_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        updateData.lease_owner = null;
        updateData.lease_expires_at = null;
      } else {
        updateData.status = 'completed';
        updateData.lease_owner = null;
        updateData.lease_expires_at = null;
      }

      await supabase.from('autonomous_schedules').update(updateData).eq('id', task.id);
      
      console.log(`[SCHEDULER] Schedule ${task.id} processed successfully`);
      await eventBus.publish(task.id, 'SCHEDULE_EXECUTION_COMPLETED', { 
        scheduleId: task.id, 
        workerId 
      });

    } catch (err) {
      console.error(`[SCHEDULER] Failed to process schedule ${task.id}:`, err);
      // Mark as failed or revert to active
      await supabase.from('autonomous_schedules').update({ 
        status: 'failed',
        lease_owner: null,
        lease_expires_at: null,
        updated_at: now
      }).eq('id', task.id);
      
      await eventBus.publish(task.id, 'SCHEDULE_EXECUTION_FAILED', { 
        scheduleId: task.id, 
        workerId,
        error: String(err)
      });
    }
  }
};

/**
 * RecoveryService handles process restart recovery
 */
export const recoveryService = {
  /**
   * Recovers all incomplete workflows and tasks on process start
   */
  async recoverIncompleteWorkflows(workerId: string = 'recovery-worker') {
    const supabase = createAdminClient();
    console.log(`[RECOVERY] Starting recovery process for worker ${workerId}`);

    try {
      await eventBus.publish('recovery', 'RECOVERY_STARTED', { workerId });

      // 1. Find all stuck processing schedules (expired leases)
      const now = new Date().toISOString();
      const { data: stuckSchedules, error: schedulesError } = await supabase
        .from('autonomous_schedules')
        .select('*')
        .eq('status', 'processing')
        .lte('lease_expires_at', now);

      if (schedulesError) {
        console.error('[RECOVERY] Failed to retrieve stuck schedules:', schedulesError);
      } else if (stuckSchedules && stuckSchedules.length > 0) {
        console.log(`[RECOVERY] Found ${stuckSchedules.length} stuck schedules to recover`);
        for (const schedule of stuckSchedules) {
          await this.recoverSchedule(schedule.id, workerId);
        }
      }

      // 2. Find all stuck/incomplete agent runs
      const { data: stuckRuns, error: runsError } = await supabase
        .from('agent_runs')
        .select('*')
        .in('status', ['running', 'paused'])
        .lte('lease_expires_at', now);

      if (runsError) {
        console.error('[RECOVERY] Failed to retrieve stuck agent runs:', runsError);
      } else if (stuckRuns && stuckRuns.length > 0) {
        console.log(`[RECOVERY] Found ${stuckRuns.length} stuck agent runs to recover`);
        for (const run of stuckRuns) {
          await this.recoverWorkflow(run.id, workerId);
        }
      }

      console.log('[RECOVERY] Recovery process completed');
      await eventBus.publish('recovery', 'RECOVERY_COMPLETED', { workerId });

    } catch (err) {
      console.error('[RECOVERY] Critical recovery error:', err);
      await eventBus.publish('recovery', 'RECOVERY_FAILED', { workerId, error: String(err) });
    }
  },

  /**
   * Recovers a single stuck schedule
   */
  async recoverSchedule(scheduleId: string, workerId: string) {
    const supabase = createAdminClient();
    console.log(`[RECOVERY] Recovering schedule ${scheduleId}`);
    try {
      await supabase.from('autonomous_schedules').update({
        status: 'active',
        lease_owner: null,
        lease_expires_at: null,
        updated_at: new Date().toISOString()
      }).eq('id', scheduleId);
      console.log(`[RECOVERY] Schedule ${scheduleId} recovered and marked as active`);
    } catch (err) {
      console.error(`[RECOVERY] Failed to recover schedule ${scheduleId}:`, err);
    }
  },

  /**
   * Recovers a single workflow and requeues incomplete tasks
   */
  async recoverWorkflow(runId: string, workerId: string) {
    const supabase = createAdminClient();
    console.log(`[RECOVERY] Recovering workflow ${runId}`);

    try {
      // 1. Load latest snapshot
      const sm = await workflowRuntime.recover(runId);
      const context = sm.getContext();

      // 2. Get all tasks from DB and find pending ones
      const { data: tasks, error: tasksError } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('run_id', runId)
        .order('priority', { ascending: true });

      if (tasksError) throw tasksError;
      
      // 3. Find the first incomplete task
      const firstIncomplete = tasks.findIndex((t: any) => t.status !== 'completed');
      
      if (firstIncomplete === -1) {
        // All tasks are complete, mark workflow as completed
        sm.transitionTo('completed');
        await workflowRuntime.checkpoint(sm);
        console.log(`[RECOVERY] Workflow ${runId} had all tasks completed`);
        return;
      }

      // 4. Requeue tasks starting from first incomplete
      console.log(`[RECOVERY] Requeuing tasks for workflow ${runId} from index ${firstIncomplete}`);
      
      // Use collaboration service's enqueue logic
      const enqueueTask = async (task: any, index: number) => {
        await eventBus.publish(runId, 'TASK_CREATED', { task, index, total: tasks.length });

        await jobQueue.enqueue(context.userId, 'task_execution' as any, {
          task,
          index,
          total: tasks.length,
          runId
        }, runId);
      };

      for (let i = firstIncomplete; i < tasks.length; i++) {
        await enqueueTask(tasks[i], i);
      }

      console.log(`[RECOVERY] Workflow ${runId} recovered and tasks requeued`);
      await eventBus.publish(runId, 'WORKFLOW_RECOVERED', { runId, workerId });

    } catch (err) {
      console.error(`[RECOVERY] Failed to recover workflow ${runId}:`, err);
      await eventBus.publish(runId, 'WORKFLOW_RECOVERY_FAILED', { runId, workerId, error: String(err) });
    }
  }
};

