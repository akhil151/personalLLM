import { eventBus, WorkflowEvent } from './eventBus';
import { jobQueue } from '@/queue/jobQueue';
import { createAdminClient } from '@/lib/supabase-admin';
import { jarvisReflectionService } from '@/services/jarvisReflectionService';
import { userMemoryExtractor } from '@/services/userMemoryExtractor';
import { jarvisRecommendationService } from '@/services/jarvisRecommendationService';
import { behaviorAnalyzer } from '@/services/behaviorAnalyzer';

/**
 * EventDispatcher coordinates the flow of events across the system.
 * It is the "Traffic Controller" that decides what happens next.
 */
export const eventDispatcher = {
  init() {
    console.log('Initializing Event Dispatcher...');

    // 1. When a plan is generated, enqueue the first task
    eventBus.subscribe('PLAN_GENERATED', async (event: WorkflowEvent) => {
      const { tasks } = event.payload;
      if (tasks && tasks.length > 0) {
        await this.enqueueTask(event.runId, tasks[0], 0, tasks.length);
      }
    });

    // 2. When a task is created, log it (Execution is handled by WorkerRuntime)
    eventBus.subscribe('TASK_CREATED', async (event: WorkflowEvent) => {
      const { task, index, total, type } = event.payload;
      if (type === 'planning') {
        console.log(`[ORCHESTRATION] Planning started for goal: "${event.payload.goal}"`);
      } else if (task) {
        console.log(`[ORCHESTRATION] Task ${index + 1}/${total} queued: "${task.title}"`);
      }
    });

    // 3. When a tool is executed, determine the next step
    eventBus.subscribe('TOOL_EXECUTED', async (event: WorkflowEvent) => {
      const { index, total, runId } = event.payload;
      
      if (index + 1 < total) {
        const supabase = createAdminClient();
        const { data: run } = await supabase
          .from('agent_runs')
          .select('*')
          .eq('id', runId)
          .single();

        if (run && run.metadata?.tasks) {
          const nextIndex = index + 1;
          const nextTask = run.metadata.tasks[nextIndex];
          await this.enqueueTask(runId, nextTask, nextIndex, total);
        }
      } else {
        await eventBus.publish(runId, 'WORKFLOW_COMPLETED', { runId });
      }
    });

    // 4. Handle workflow completion
    eventBus.subscribe('WORKFLOW_COMPLETED', async (event: WorkflowEvent) => {
      const { runId } = event.payload;
      console.log(`[ORCHESTRATION] Workflow ${runId} finished. Activating Reflection & Learning...`);

      try {
        const supabase = createAdminClient();
        const { data: run } = await supabase
          .from('agent_runs')
          .select('*')
          .eq('id', runId)
          .single();

        if (run) {
          // 1. Generate & Store Reflection
          console.log(`[LEARNING] Generating reflection for run ${runId}...`);
          const reflection = await jarvisReflectionService.generateReflection(runId);
          
          if (reflection) {
            // 2. Update User Profile (Memory Extraction)
            console.log(`[LEARNING] Extracting memories for user ${run.user_id}...`);
            await userMemoryExtractor.extractAndStoreProfile(run.user_id);

            // 3. Update Goals (Mark as completed if run goal was achieved)
            console.log(`[LEARNING] Updating goals...`);
            const { data: goals } = await supabase
              .from('jarvis_goals')
              .select('*')
              .eq('user_id', run.user_id)
              .eq('status', 'active');
            
            if (goals) {
              for (const goal of goals) {
                if (run.goal.toLowerCase().includes(goal.title.toLowerCase())) {
                  await supabase.from('jarvis_goals').update({ status: 'completed', progress: 100 }).eq('id', goal.id);
                }
              }
            }

            // 4. Update Behavior Profile
            console.log(`[LEARNING] Analyzing behavioral patterns...`);
            await behaviorAnalyzer.analyzeBehavior(run.user_id);

            // 5. Trigger Recommendation Refresh
            console.log(`[LEARNING] Refreshing recommendations...`);
            await jarvisRecommendationService.getRecommendations();
          }
        }
      } catch (err) {
        console.error('[LEARNING] Activation failed:', err);
      }
    });
  },

  /**
   * Internal helper to enqueue a task as a background job.
   */
  async enqueueTask(runId: string, task: any, index: number, total: number) {
    const supabase = createAdminClient();
    const { data: run } = await supabase
      .from('agent_runs')
      .select('user_id')
      .eq('id', runId)
      .single();

    if (!run) return;

    // 1. Publish Event
    await eventBus.publish(runId, 'TASK_CREATED', { task, index, total });

    // 2. Enqueue Background Job for the Worker to pick up
    await jobQueue.enqueue(run.user_id, 'task_execution' as any, {
      task,
      index,
      total,
      runId
    }, runId);
  }
};
