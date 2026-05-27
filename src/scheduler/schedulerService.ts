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
   */
  async processSchedules() {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: dueTasks, error } = await supabase
      .from('autonomous_schedules')
      .select('*')
      .eq('status', 'active')
      .lte('next_run_at', now);

    if (error) {
      console.error('Schedule Scan Error:', error);
      return;
    }

    for (const task of dueTasks) {
      try {
        console.log(`Executing Scheduled Task: ${task.name}`);
        
        // 1. Trigger the workflow
        await workflowRuntime.startWorkflow(task.user_id, '', task.workflow_type, task.payload);

        // 2. Update or complete the schedule
        if (task.cron_expression) {
          // Calculate next run based on cron (simplified)
          const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to +1 day
          await supabase.from('autonomous_schedules').update({ next_run_at: nextRun.toISOString() }).eq('id', task.id);
        } else {
          await supabase.from('autonomous_schedules').update({ status: 'completed' }).eq('id', task.id);
        }

      } catch (err) {
        console.error(`Failed to execute scheduled task ${task.id}:`, err);
      }
    }
  }
};
