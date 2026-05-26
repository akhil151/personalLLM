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
  async run(userId: string, conversationId: string, goal: string) {
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
      
      // 4. Checkpoint State
      sm.updateVariables({ tasks: planningResult.data.tasks });
      await workflowRuntime.checkpoint(sm);
      await eventBus.publish(context.runId, 'PLAN_GENERATED', { tasks: planningResult.data.tasks });

      // 5. PHASE 2: EXECUTION LOOP
      const tasks = planningResult.data.tasks;
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        // A. Memory Retrieval
        const memoryResult = await orchestratorService.dispatch('memory', {
          runId: context.runId,
          conversationId,
          userId,
          data: { task, goal }
        });

        // B. Execution
        const executionResult = await orchestratorService.dispatch('executor', {
          runId: context.runId,
          conversationId,
          userId,
          data: { task, context: memoryResult.data, goal }
        });

        // C. REFLECTION (Phase 5 Addition)
        const evaluation = await reflectionEngine.reflect(goal, task.title, executionResult.data);
        
        if (!evaluation.success) {
          console.log(`Self-Correction Triggered: ${evaluation.correction_plan}`);
          // In a full implementation, we would retry or adjust the task here.
        }

        // D. Checkpoint after each task
        sm.updateVariables({ [`task_${i}_result`]: executionResult.data });
        await workflowRuntime.checkpoint(sm);
        await eventBus.publish(context.runId, 'TOOL_EXECUTED', { task: task.title, result: executionResult.data });
      }

      // 6. FINALIZATION
      sm.transitionTo('completed');
      await workflowRuntime.checkpoint(sm);
      await eventBus.publish(context.runId, 'WORKFLOW_COMPLETED', { goal });

      return { success: true, runId: context.runId };

    } catch (error: any) {
      console.error('Durable Pipeline Error:', error);
      sm.transitionTo('failed');
      await workflowRuntime.checkpoint(sm);
      await eventBus.publish(context.runId, 'JOB_FAILED', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};
