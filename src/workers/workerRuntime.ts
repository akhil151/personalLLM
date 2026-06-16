import { createAdminClient } from '@/lib/supabase-admin';
import { jobQueue } from '@/queue/jobQueue';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { workflowRuntime } from '@/runtime/workflowRuntime';
import { eventBus } from '@/events/eventBus';
import { reflectionEngine } from '@/reflection/reflectionEngine';
import { memoryService } from '@/services/memory/memoryService';
import { safetyGuard } from '@/safety/safetyGuard';
import { observabilityService } from '@/services/observability/observabilityService';
import { recoveryService, schedulerService } from '@/scheduler/schedulerService';
import { browserSessionManager } from '@/browser/browserSessionManager';

/**
 * Resource limits configuration
 */
export const RESOURCE_LIMITS = {
  MAX_CONCURRENT_WORKFLOWS: 10,
  MAX_CONCURRENT_BROWSER_SESSIONS: 5,
  MAX_QUEUED_TASKS: 100,
  MEMORY_THRESHOLD_MB: 2048
};

/**
 * WorkerRuntime is the distributed execution engine.
 */
export const workerRuntime = {
  isRunning: false,
  workerId: `worker-${Math.random().toString(36).substring(2, 9)}`,
  activeJobs: new Set(),
  shutdownInProgress: false,

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.shutdownInProgress = false;
    console.log(`[WORKER] Worker Runtime Started (${this.workerId})`);

    // Step 1: Register graceful shutdown handlers
    this.registerShutdownHandlers();

    // Step 2: Run recovery on startup
    console.log('[WORKER] Running startup recovery...');
    await recoveryService.recoverIncompleteWorkflows(this.workerId);
    console.log('[WORKER] Startup recovery complete');

    while (this.isRunning) {
      try {
        if (this.shutdownInProgress) {
          console.log('[WORKER] Shutdown in progress, waiting for active jobs to complete...');
          if (this.activeJobs.size === 0) {
            console.log('[WORKER] No active jobs, shutting down');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Check resource limits before taking new jobs
        const canTakeJob = await this.checkResourceLimits();
        if (!canTakeJob) {
          console.log('[WORKER] Resource limits reached, waiting...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // Process both jobs and schedules
        await schedulerService.processSchedules(this.workerId);
        
        const job = await jobQueue.getNextJob(this.workerId);
        if (job) {
          this.activeJobs.add(job.id);
          await observabilityService.logWorkerEvent('job_started', job.id, { type: job.job_type, workerId: this.workerId });
          await this.processJob(job);
          this.activeJobs.delete(job.id);
          await observabilityService.logWorkerEvent('job_completed', job.id);
        } else {
          // No job found, wait 3s
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (err) {
        console.error('[WORKER] Error in main loop:', err);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('[WORKER] Worker stopped');
  },

  registerShutdownHandlers() {
    if (typeof process !== 'undefined') {
      process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
      process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    }
  },

  async handleShutdown(signal: string) {
    if (this.shutdownInProgress) return;
    console.log(`[WORKER] Received ${signal}, initiating graceful shutdown...`);
    this.shutdownInProgress = true;

    // 1. Close all active browser sessions
    const supabase = createAdminClient();
    const { data: activeSessions } = await supabase
      .from('browser_sessions')
      .select('*')
      .eq('status', 'active');
    if (activeSessions) {
      console.log(`[WORKER] Closing ${activeSessions.length} active browser sessions...`);
      for (const session of activeSessions) {
        await browserSessionManager.closeSession(session.id);
      }
    }

    // 2. Wait for active jobs to complete (up to 30 seconds)
    const shutdownStart = Date.now();
    while (this.activeJobs.size > 0 && Date.now() - shutdownStart < 30000) {
      console.log(`[WORKER] Waiting for ${this.activeJobs.size} active jobs...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 3. Stop the worker
    this.isRunning = false;
    console.log('[WORKER] Graceful shutdown complete');
  },

  async stop() {
    await this.handleShutdown('MANUAL');
  },

  async checkResourceLimits(): Promise<boolean> {
    const supabase = createAdminClient();

    // 1. Check concurrent workflows
    const { count: runningWorkflows } = await supabase
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['running', 'in_progress']);
    if (runningWorkflows && runningWorkflows >= RESOURCE_LIMITS.MAX_CONCURRENT_WORKFLOWS) {
      console.log(`[WORKER] Max concurrent workflows reached: ${RESOURCE_LIMITS.MAX_CONCURRENT_WORKFLOWS}`);
      return false;
    }

    // 2. Check concurrent browser sessions
    const { count: activeSessions } = await supabase
      .from('browser_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    if (activeSessions && activeSessions >= RESOURCE_LIMITS.MAX_CONCURRENT_BROWSER_SESSIONS) {
      console.log(`[WORKER] Max concurrent browser sessions reached: ${RESOURCE_LIMITS.MAX_CONCURRENT_BROWSER_SESSIONS}`);
      return false;
    }

    // 3. Check queued tasks
    const { count: queuedTasks } = await supabase
      .from('background_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'retrying']);
    if (queuedTasks && queuedTasks >= RESOURCE_LIMITS.MAX_QUEUED_TASKS) {
      console.log(`[WORKER] Max queued tasks reached: ${RESOURCE_LIMITS.MAX_QUEUED_TASKS}`);
      return false;
    }

    // 4. Check memory usage (if available)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usedMB = process.memoryUsage().heapUsed / 1024 / 1024;
      if (usedMB > RESOURCE_LIMITS.MEMORY_THRESHOLD_MB) {
        console.log(`[WORKER] Memory threshold exceeded: ${usedMB.toFixed(0)}MB > ${RESOURCE_LIMITS.MEMORY_THRESHOLD_MB}MB`);
        return false;
      }
    }

    return true;
  },

  async processJob(job: any) {
    console.log(`[WORKER] Processing Job ${job.id} (${job.job_type})...`);
    const supabase = createAdminClient();

    try {
      await this.executeJobLogic(job);

      await supabase.from('background_jobs').update({ 
        status: 'completed',
        lease_owner: null,
        lease_expires_at: null,
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
        lease_owner: null,
        lease_expires_at: null,
        next_run_at: new Date(Date.now() + Math.pow(2, attempts) * 5000).toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', job.id);

      if (job.job_type === 'task_execution') {
        await eventBus.publish(job.run_id, 'JOB_FAILED', { error: err.message });
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
      case 'schedule_workflow':
        await this.handleScheduleWorkflow(job.payload);
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
      data: { 
        task, 
        context: contextData, 
        goal: context.variables.goal,
        fullContext: context.variables
      }
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
  },

  /**
   * Handle starting a scheduled workflow
   */
  async handleScheduleWorkflow(payload: any) {
    const { scheduleId, workflowType, payload: schedulePayload } = payload;
    console.log(`[WORKER] Starting scheduled workflow for schedule ${scheduleId}`);
    
    // Start workflow via executionPipeline (same as chat)
    const { executionPipeline } = await import('@/orchestrator/executionPipeline');
    
    // Get user_id from schedule first
    const supabase = createAdminClient();
    const { data: schedule } = await supabase
      .from('autonomous_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    await executionPipeline.run(schedule.user_id, '', schedulePayload.goal || 'Scheduled workflow');
    console.log(`[WORKER] Scheduled workflow ${scheduleId} started`);
  }
};
