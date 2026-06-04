import { createAdminClient } from '@/lib/supabase-admin';
import { workflowRuntime } from '@/runtime/workflowRuntime';

/**
 * SchedulerService enables proactive autonomous behavior.
 * 
 * PROACTIVE AI CONCEPTS:
 * 1. Time-based triggers: Executing workflows at specific intervals (Cron).
 * 2. Event-based triggers: Executing workflows when a user condition is met.
 * 3. Autonomous follow-ups: The AI deciding to check back with a user later.
 */
export const schedulerService = {
  /**
   * Schedules a new autonomous task.
   */
  async scheduleTask(userId: string, name: string, nextRun: Date, type: string, payload: any = {}) {
    const supabase = createAdminClient();

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

    if (error) throw error;
    return data;
  },

  /**
   * Scans for due tasks and executes them.
   * Uses atomic claiming to ensure a task is only started once.
   */
  async processSchedules(workerId: string = 'scheduler-worker') {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // 1. Claim one due task
    const { data: task, error } = await supabase
      .from('autonomous_schedules')
      .update({ 
        status: 'processing',
        updated_at: now
      })
      .eq('status', 'active')
      .lte('next_run_at', now)
      .select()
      .limit(1)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') console.error('Schedule Scan Error:', error);
      return;
    }

    try {
      console.log(`[SCHEDULER] Executing: ${task.name} (Claimed by ${workerId})`);
      
      // 2. Trigger the workflow
      await workflowRuntime.startWorkflow(task.user_id, '', task.workflow_type, task.payload);

      // 3. Update or complete the schedule
      if (task.cron_expression) {
        // Calculate next run based on cron (simplified)
        const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); 
        await supabase.from('autonomous_schedules').update({ 
          status: 'active',
          next_run_at: nextRun 
        }).eq('id', task.id);
      } else {
        await supabase.from('autonomous_schedules').update({ status: 'completed' }).eq('id', task.id);
      }

    } catch (err) {
      console.error(`[SCHEDULER] Failed to execute task ${task.id}:`, err);
      // Revert to active on failure so it can be retried
      await supabase.from('autonomous_schedules').update({ status: 'active' }).eq('id', task.id);
    }
  }
};
