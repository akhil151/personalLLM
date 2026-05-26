import { orchestratorService } from './orchestratorService';

/**
 * ExecutionPipeline manages the lifecycle of an agentic process.
 * 
 * THE COGNITIVE LOOP:
 * 1. PLAN: Decompose the user's goal into a set of actionable tasks.
 * 2. EXECUTE: Run tools and perform actions for each task.
 * 3. OBSERVE: Gather results and update the shared state.
 * 4. REFLECT: Evaluate progress and decide if more steps are needed.
 */
export const executionPipeline = {
  async run(userId: string, conversationId: string, goal: string) {
    const run = await orchestratorService.startRun(userId, conversationId, goal);
    
    try {
      // PHASE 1: PLANNING
      // We ask the Planner Agent to break down the goal.
      const planningResult = await orchestratorService.dispatch('planner', {
        runId: run.id,
        conversationId,
        userId,
        data: { goal }
      });

      if (!planningResult.success) {
        throw new Error(`Planning failed: ${planningResult.error}`);
      }

      const tasks = planningResult.data.tasks;

      // PHASE 2: SEQUENTIAL EXECUTION
      for (const task of tasks) {
        // Log task start
        await orchestratorService.logStep(run.id, 'orchestrator', 'thought', `Executing task: ${task.title}`);

        // A. CONTEXT RETRIEVAL (Memory Agent)
        const contextResult = await orchestratorService.dispatch('memory', {
          runId: run.id,
          conversationId,
          userId,
          data: { task, goal }
        });

        // B. ACTION (Executor Agent)
        const executionResult = await orchestratorService.dispatch('executor', {
          runId: run.id,
          conversationId,
          userId,
          data: { 
            task, 
            context: contextResult.data,
            goal 
          }
        });

        if (!executionResult.success) {
          // PHASE 3: REFLECTION & RETRY (Simple version)
          await orchestratorService.logStep(run.id, 'orchestrator', 'reflection', `Task failed: ${task.title}. Attempting to recover...`);
          // Here we could re-plan or retry. For now, we'll stop.
          throw new Error(`Execution failed at task: ${task.title}. Error: ${executionResult.error}`);
        }
      }

      // PHASE 4: FINALIZATION
      await orchestratorService.updateRunStatus(run.id, 'completed');
      return { success: true, runId: run.id };

    } catch (error: any) {
      console.error('Pipeline Error:', error);
      await orchestratorService.logStep(run.id, 'orchestrator', 'error', error.message);
      await orchestratorService.updateRunStatus(run.id, 'failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};
