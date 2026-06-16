import { createAdminClient } from '@/lib/supabase-admin';

interface BrowserLogEntry {
  workflowId?: string;
  taskId?: string;
  sessionId: string;
  event: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export const browserObservability = {
  async log(event: BrowserLogEntry) {
    const logEntry = {
      ...event,
      timestamp: event.timestamp.toISOString()
    };
    
    console.log('[BROWSER_OBSERVABILITY]', logEntry);
    
    try {
      const supabase = createAdminClient();
      await supabase
        .from('browser_logs')
        .insert([logEntry]);
    } catch (err) {
      console.error('[BROWSER_OBSERVABILITY] Failed to write log to DB:', err);
    }
  },

  async sessionStarted(sessionId: string, workflowId?: string, taskId?: string) {
    await this.log({
      sessionId,
      workflowId,
      taskId,
      event: 'session_started',
      timestamp: new Date()
    });
  },

  async navigationStarted(sessionId: string, url: string, workflowId?: string, taskId?: string) {
    await this.log({
      sessionId,
      workflowId,
      taskId,
      event: 'navigation_started',
      timestamp: new Date(),
      metadata: { url }
    });
  },

  async actionExecuted(sessionId: string, actionType: string, selector?: string, workflowId?: string, taskId?: string) {
    await this.log({
      sessionId,
      workflowId,
      taskId,
      event: 'action_executed',
      timestamp: new Date(),
      metadata: { actionType, selector }
    });
  },

  async screenshotCaptured(sessionId: string, type: string, screenshotUrl: string, workflowId?: string, taskId?: string) {
    await this.log({
      sessionId,
      workflowId,
      taskId,
      event: 'screenshot_captured',
      timestamp: new Date(),
      metadata: { type, screenshotUrl }
    });
  },

  async browserTaskCompleted(sessionId: string, success: boolean, workflowId?: string, taskId?: string) {
    await this.log({
      sessionId,
      workflowId,
      taskId,
      event: 'browser_task_completed',
      timestamp: new Date(),
      metadata: { success }
    });
  },

  async browserTaskFailed(sessionId: string, error: string, workflowId?: string, taskId?: string) {
    await this.log({
      sessionId,
      workflowId,
      taskId,
      event: 'browser_task_failed',
      timestamp: new Date(),
      metadata: { error }
    });
  }
};
