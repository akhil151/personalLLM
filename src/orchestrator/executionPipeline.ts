import { createClient } from '@/lib/supabase-server';
import { workflowRuntime } from '@/runtime/workflowRuntime';
import { eventBus } from '@/events/eventBus';
import { orchestratorService } from './orchestratorService';
import { reflectionEngine } from '@/reflection/reflectionEngine';
import { safetyGuard } from '@/safety/safetyGuard';

/**
 * PHASE 5: Durable & Event-Driven Execution Pipeline
 * 
 * This version replaces the linear loop with a checkpointed, event-driven flow.
 */
export const executionPipeline = {
  async run(userId: string, conversationId: string, goal: string): Promise<{ success: boolean; runId?: string; error?: string }> {
    // 1. Start a Durable Workflow
    const sm = await workflowRuntime.startWorkflow(userId, conversationId, 'agent_orchestration', { goal });
    const context = sm.getContext();

    try {
      // 2. Initial Safety Check
      const safety = await safetyGuard.checkSafety(context.runId, userId, 0, 0);
      if (!safety.safe) throw new Error(safety.reason);

      // 3. PHASE 1: PLANNING (Emitting Event)
      await eventBus.publish(context.runId, 'TASK_CREATED', { type: 'planning', goal });
      
      const planningResult = await orchestratorService.dispatch('planner', {
        runId: context.runId,
        conversationId,
        userId,
        data: { goal }
      });

      if (!planningResult.success) throw new Error(`Planning failed: ${planningResult.error}`);
      
      // 4. Checkpoint State & Start Execution via Events
      sm.updateVariables({ tasks: planningResult.data.tasks });
      await workflowRuntime.checkpoint(sm);
      
      // 5. WAIT FOR COMPLETION (Stable Async Bridge)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Workflow execution timed out.'));
        }, 1000 * 60 * 10);

        const onComplete = async (event: any) => {
          if (event.runId === context.runId) {
            cleanup();
            resolve({ success: true, runId: context.runId });
          }
        };

        const onFail = async (event: any) => {
          if (event.runId === context.runId) {
            cleanup();
            reject(new Error(event.payload.error));
          }
        };

        const cleanup = () => {
          clearTimeout(timeout);
          eventBus.unsubscribe('WORKFLOW_COMPLETED', onComplete);
          eventBus.unsubscribe('JOB_FAILED', onFail);
        };

        eventBus.subscribe('WORKFLOW_COMPLETED', onComplete);
        eventBus.subscribe('JOB_FAILED', onFail);

        // Trigger the first task
        eventBus.publish(context.runId, 'PLAN_GENERATED', { 
          tasks: planningResult.data.tasks 
        });
      });

    } catch (error: any) {
      console.error('Durable Pipeline Error:', error);
      sm.transitionTo('failed');
      await workflowRuntime.checkpoint(sm);
      await eventBus.publish(context.runId, 'JOB_FAILED', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};
