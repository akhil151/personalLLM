import { createClient } from '@/lib/supabase-server';

export type JobType = 'research' | 'embedding_generation' | 'document_analysis' | 'web_crawl';

/**
 * JobQueue manages asynchronous background tasks.
 * 
 * WHY A JOB QUEUE?
 * 1. Reliability: HTTP requests are ephemeral. If a browser closes, the task dies.
 * 2. Concurrency: We can control how many heavy tasks run at once.
 * 3. Retries: If an external API (like OpenAI) is down, we can retry with exponential backoff.
 */
export const jobQueue = {
  /**
   * Enqueues a new background job.
   */
  async enqueue(userId: string, type: JobType, payload: any, runId?: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('background_jobs')
      .insert([{
        user_id: userId,
        workflow_run_id: runId,
        job_type: type,
        payload: payload,
        status: 'queued'
      }])
      .select()
      .single();

    if (error) throw error;
    console.log(`Job Enqueued: ${type} (${data.id})`);
    return data;
  },

  /**
   * Fetches the next available job to process.
   */
  async getNextJob() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .or('status.eq.queued,status.eq.retrying')
      .lt('next_run_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
    return data;
  }
};
