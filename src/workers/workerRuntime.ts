import { createClient } from '@/lib/supabase-server';
import { jobQueue } from '@/queue/jobQueue';

/**
 * WorkerRuntime is the execution loop for background jobs.
 * 
 * DISTRIBUTED WORKER CONCEPTS:
 * 1. Polling: Continuously checking the queue for new work.
 * 2. Exponential Backoff: Increasing delay between retries for failing jobs.
 * 3. Dead Letter Queue (DLQ): Moving permanently failed jobs to a separate state for manual review.
 */
export const workerRuntime = {
  private isRunning: boolean = false;

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Worker Runtime Started.');

    while (this.isRunning) {
      try {
        const job = await jobQueue.getNextJob();
        if (job) {
          await this.processJob(job);
        } else {
          // No jobs, wait a bit
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (err) {
        console.error('Worker Runtime Error:', err);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  },

  async stop() {
    this.isRunning = false;
  },

  private async processJob(job: any) {
    console.log(`Processing Job ${job.id} (${job.job_type})...`);
    const supabase = await createClient();

    // 1. Mark as processing
    await supabase.from('background_jobs').update({ status: 'processing' }).eq('id', job.id);

    try {
      // 2. Execute Job Logic
      // In a real system, this would switch on job.job_type and call specific handlers
      await this.executeJobLogic(job);

      // 3. Mark as completed
      await supabase.from('background_jobs').update({ status: 'completed' }).eq('id', job.id);
      console.log(`Job ${job.id} completed.`);

    } catch (err: any) {
      const attempts = job.attempts + 1;
      const isFinalFailure = attempts >= job.max_attempts;

      console.error(`Job ${job.id} failed (Attempt ${attempts}):`, err.message);

      // 4. Handle Failure & Retries
      await supabase.from('background_jobs').update({
        status: isFinalFailure ? 'failed' : 'retrying',
        attempts: attempts,
        error_log: err.message,
        next_run_at: new Date(Date.now() + Math.pow(2, attempts) * 1000).toISOString(), // Exponential backoff
        updated_at: new Date().toISOString()
      }).eq('id', job.id);
    }
  },

  private async executeJobLogic(job: any) {
    // Simulated heavy task
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (Math.random() < 0.1) {
      throw new Error('Simulated random failure for retry testing.');
    }
  }
};
