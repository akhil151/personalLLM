import { createAdminClient } from '@/lib/supabase-admin';

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
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('background_jobs')
      .insert([{
        user_id: userId,
        run_id: runId,
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
   * Fetches the next available job to process using atomic claiming.
   * This prevents multiple workers from picking up the same job.
   */
  async getNextJob(workerId: string = 'default-worker') {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const leaseTime = new Date(Date.now() + 1000 * 60 * 5).toISOString(); // 5 min lease

    // 1. Find a candidate job
    const { data: candidate, error: findError } = await supabase
      .from('background_jobs')
      .select('id')
      .or('status.eq.queued,status.eq.retrying')
      .lt('next_run_at', now)
      .or(`lease_expires_at.lt.${now},lease_owner.is.null`)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (findError || !candidate) return null;

    // 2. ATOMIC CLAIM
    const { data, error } = await supabase
      .from('background_jobs')
      .update({ 
        status: 'processing',
        lease_owner: workerId,
        lease_expires_at: leaseTime,
        updated_at: now
      })
      .eq('id', candidate.id)
      .or('status.eq.queued,status.eq.retrying') // Verify still available
      .or(`lease_expires_at.lt.${now},lease_owner.is.null`) // Verify still unleased
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Lost the race
      throw error;
    }
    
    return data;
  }
};
