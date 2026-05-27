import { createAdminClient } from '@/lib/supabase-admin';
import { jobQueue } from '@/queue/jobQueue';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { workflowRuntime } from '@/runtime/workflowRuntime';
import { eventBus } from '@/events/eventBus';
import { reflectionEngine } from '@/reflection/reflectionEngine';
import { memoryService } from '@/services/memory/memoryService';
import { safetyGuard } from '@/safety/safetyGuard';
import { observabilityService } from '@/services/observability/observabilityService';

/**
 * WorkerRuntime is the distributed execution engine.
 */
export const workerRuntime = {
  isRunning: false,

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[WORKER] Worker Runtime Started.');

    while (this.isRunning) {
      try {
        const job = await jobQueue.getNextJob();
        if (job) {
          await observabilityService.logWorkerEvent('job_started', job.id, { type: job.job_type });
          await this.processJob(job);
          await observabilityService.logWorkerEvent('job_completed', job.id);
        } else {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (err) {
        console.error('[WORKER] Error in main loop:', err);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  },

  async stop() {
    this.isRunning = false;
  },

  async processJob(job: any) {
    console.log(`[WORKER] Processing Job ${job.id} (${job.job_type})...`);
    const supabase = createAdminClient();

    await supabase.from('background_jobs').update({ 
      status: 'processing',
      updated_at: new Date().toISOString() 
    }).eq('id', job.id);

    try {
      await this.executeJobLogic(job);

      await supabase.from('background_jobs').update({ 
        status: 'completed',
        updated_at: new Date().toISOString() 
      }).eq('id', job.id);
      
      console.log(`[WORKER] Job ${job.id} completed.`);

    } catch (err: any) {
      const attempts = job.attempts + 1;
      const isFinalFailure = attempts >= job.max_attempts;

      console.error(`[WORKER] Job ${job.id} failed (Attempt ${attempts}):`, err.message);
      await observabilityService.logWorkerEvent('job_failed', job.id, { error: err.message, attempts });

      await supabase.from('background_jobs').update({
        status: isFinalFailure ? 'failed' : 'retrying',
        attempts: attempts,
        error_log: err.message,
        next_run_at: new Date(Date.now() + Math.pow(2, attempts) * 5000).toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', job.id);

      if (job.job_type === 'task_execution') {
        await eventBus.publish(job.workflow_run_id, 'JOB_FAILED', { error: err.message });
      }
    }
  },

  async executeJobLogic(job: any) {
    switch (job.job_type) {
      case 'task_execution':
        await this.handleTaskExecution(job.payload);
        break;
      case 'embedding_generation':
        await this.handleEmbeddingGeneration(job.payload);
        break;
      default:
        console.warn(`[WORKER] Unknown job type: ${job.job_type}`);
    }
  },

  /**
   * REAL TASK EXECUTION LOGIC
   * Moved from the previously unstable executionPipeline loop.
   */
  async handleTaskExecution(payload: any) {
    const { task, index, total, runId } = payload;
    const supabase = createAdminClient();

    // 1. REHYDRATE WORKFLOW STATE
    const sm = await workflowRuntime.recover(runId);
    const context = sm.getContext();

    // 2. RUNTIME SAFETY CHECK (In-loop)
    const safety = await safetyGuard.checkSafety(runId, context.userId, context.stepIndex, 0);
    if (!safety.safe) throw new Error(`Safety Violation: ${safety.reason}`);

    // 3. UPDATE TASK STATUS
    await supabase.from('agent_tasks').update({ status: 'in_progress' }).eq('id', task.id);

    // 4. MEMORY RETRIEVAL
    let contextData = {};
    if (task.assigned_agent !== 'memory') {
      const memoryResult = await orchestratorService.dispatch('memory', {
        runId,
        conversationId: context.conversationId,
        userId: context.userId,
        data: { task, goal: context.variables.goal }
      });
      contextData = memoryResult.data;
    }

    // 5. EXECUTE AGENT
    const executionResult = await orchestratorService.dispatch(task.assigned_agent, {
      runId,
      conversationId: context.conversationId,
      userId: context.userId,
      data: { task, context: contextData, goal: context.variables.goal }
    });

    if (!executionResult.success) throw new Error(executionResult.error || 'Execution failed');

    // 6. REFLECTION
    const evaluation = await reflectionEngine.reflect(context.variables.goal, task.title, executionResult.data);
    
    // 7. UPDATE DB & CHECKPOINT
    await supabase.from('agent_tasks').update({ 
      status: 'completed',
      output: executionResult.data 
    }).eq('id', task.id);

    sm.updateVariables({ [`task_${index}_result`]: executionResult.data });
    await workflowRuntime.checkpoint(sm);

    // 8. SIGNAL COMPLETION
    await eventBus.publish(runId, 'TOOL_EXECUTED', { 
      task: task.title, 
      index, 
      total, 
      runId,
      result: executionResult.data,
      reflection: evaluation
    });
  },

  /**
   * REAL EMBEDDING GENERATION
   */
  async handleEmbeddingGeneration(payload: any) {
    const { messageId, conversationId, userId, content } = payload;
    console.log(`[WORKER] Generating embedding for message ${messageId}`);
    await memoryService.storeMessageEmbedding(messageId, conversationId, userId, content);
  }
};
