import { createAdminClient } from '@/lib/supabase-admin';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { browserSafetyGuard } from '@/safety/browserSafetyGuard';
import { browserSessionManager } from './browserSessionManager';

// In-memory store for active browser instances (Cache)
const sessions = new Map<string, { browser: Browser, context: BrowserContext, page: Page, createdAt: number }>();

// Cleanup orphaned sessions on interval (every 5 minutes)
const ORPHANED_SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Retry config
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000
};

class BrowserActionError extends Error {
  constructor(message: string, public actionType: string, public details?: any) {
    super(message);
    this.name = 'BrowserActionError';
  }
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = RETRY_CONFIG.maxRetries): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      console.log(`[BROWSER] Retrying action (${retries} left)...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelayMs));
      return retryWithBackoff(fn, retries - 1);
    }
    throw err;
  }
}

async function timeoutPromise<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new BrowserActionError('Action timed out', 'timeout')), timeoutMs);
    promise
      .then(result => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch(err => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

// Start cleanup interval
setInterval(async () => {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    if (now - session.createdAt > ORPHANED_SESSION_TIMEOUT) {
      console.log(`[BROWSER] Cleaning up orphaned session ${sessionId}`);
      await browserRuntime.close(sessionId);
    }
  }
}, ORPHANED_SESSION_TIMEOUT);

/**
 * BrowserRuntime is the execution engine for real-world environmental interaction.
 * Now stabilized with:
 * 1. Runtime Safety Governance
 * 2. Session Durability (StorageState persistence)
 * 3. Fault-tolerant session recovery
 * 4. Automatic cleanup of orphaned sessions
 * 5. Retries and timeouts for actions
 */
export const browserRuntime = {
  /**
   * Internal helper to get or create a browser session.
   * If the in-memory cache is empty, it attempts to restore from the database.
   */
  async getSession(sessionId: string) {
    let session = sessions.get(sessionId);
    if (!session) {
      console.log(`[BROWSER] Session ${sessionId} not in memory. Attempting recovery...`);
      const supabase = createAdminClient();
      const { data: dbSession } = await supabase
        .from('browser_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      const browser = await chromium.launch({ headless: true });
      
      // RESTORE STATE: If we have storageState in metadata, use it.
      const storageState = dbSession?.metadata?.storageState;
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        storageState: storageState || undefined
      });

      const page = await context.newPage();
      
      // If we have a last URL, go there to resume
      if (dbSession?.metadata?.lastUrl) {
        await page.goto(dbSession.metadata.lastUrl, { waitUntil: 'networkidle' });
      }

      session = { browser, context, page, createdAt: Date.now() };
      sessions.set(sessionId, session);
    }
    return session;
  },

  /**
   * Persists the current browser state (cookies, local storage) to the DB.
   */
  async persistState(sessionId: string, page: Page, context: BrowserContext) {
    const supabase = createAdminClient();
    const storageState = await context.storageState();
    const lastUrl = page.url();

    await supabase
      .from('browser_sessions')
      .update({
        metadata: { storageState, lastUrl },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  },

  async captureScreenshot(sessionId: string, type: 'start' | 'failure' | 'final'): Promise<string> {
    const { page } = await this.getSession(sessionId);
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
    const base64Screenshot = screenshot.toString('base64');
    const url = page.url();
    const title = await page.title();
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('page_snapshots')
      .insert([{
        session_id: sessionId,
        url,
        title,
        screenshot_url: `data:image/jpeg;base64,${base64Screenshot}`,
        perception_data: { type }
      }])
      .select()
      .single();

    return data.screenshot_url;
  },

  /**
   * Navigates to a URL using real Playwright.
   */
  async navigate(sessionId: string, url: string) {
    const action = { type: 'navigate', payload: { url } };
    
    // 1. SAFETY CHECK
    const safety = await browserSafetyGuard.isActionSafe(sessionId, action);
    if (!safety.safe) throw new BrowserActionError(`Safety Violation: ${safety.reason}`, 'navigate');

    const supabase = createAdminClient();
    const { page, context } = await this.getSession(sessionId);

    // 2. Log Action
    const { data: actionRecord } = await supabase
      .from('browser_actions')
      .insert([{
        session_id: sessionId,
        action_type: 'navigate',
        payload: { url },
        status: 'pending'
      }])
      .select()
      .single();

    try {
      console.log(`[BROWSER] Navigating to ${url}...`);
      
      // Capture start screenshot
      await this.captureScreenshot(sessionId, 'start');
      
      // 3. REAL NAVIGATION with timeout and retry
      await timeoutPromise(
        retryWithBackoff(async () => {
          await page.goto(url, { waitUntil: 'networkidle', timeout: RETRY_CONFIG.timeoutMs });
        }),
        RETRY_CONFIG.timeoutMs
      );

      // 4. PERSIST STATE FOR DURABILITY
      await this.persistState(sessionId, page, context);

      // 5. Update Action
      await supabase
        .from('browser_actions')
        .update({ status: 'completed' })
        .eq('id', actionRecord.id);

      // Capture final screenshot
      await this.captureScreenshot(sessionId, 'final');

      const title = await page.title();
      return { success: true, url, title };

    } catch (err: any) {
      console.error(`[BROWSER_ERROR] Navigation failed: ${err.message}`);
      
      // Capture failure screenshot
      try {
        await this.captureScreenshot(sessionId, 'failure');
      } catch (screenshotErr) {
        console.error('[BROWSER_ERROR] Failed to capture failure screenshot', screenshotErr);
      }
      
      await supabase
        .from('browser_actions')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', actionRecord.id);
      
      if (err instanceof BrowserActionError) throw err;
      throw new BrowserActionError(err.message, 'navigate', err);
    }
  },

  /**
   * Clicks an element using real Playwright selectors.
   */
  async click(sessionId: string, selector: string) {
    const action = { type: 'click', selector };
    
    // 1. SAFETY CHECK
    const safety = await browserSafetyGuard.isActionSafe(sessionId, action);
    if (!safety.safe) throw new BrowserActionError(`Safety Violation: ${safety.reason}`, 'click');

    const supabase = createAdminClient();
    const { page, context } = await this.getSession(sessionId);
    
    const { data: actionRecord } = await supabase
      .from('browser_actions')
      .insert([{
        session_id: sessionId,
        action_type: 'click',
        selector,
        status: 'pending'
      }])
      .select()
      .single();

    try {
      console.log(`[BROWSER] Clicking ${selector}...`);
      
      await this.captureScreenshot(sessionId, 'start');
      
      await timeoutPromise(
        retryWithBackoff(async () => {
          await page.click(selector, { timeout: RETRY_CONFIG.timeoutMs });
        }),
        RETRY_CONFIG.timeoutMs
      );
      
      // 2. PERSIST STATE
      await this.persistState(sessionId, page, context);
      
      await supabase
        .from('browser_actions')
        .update({ status: 'completed' })
        .eq('id', actionRecord.id);
      
      await this.captureScreenshot(sessionId, 'final');
      
      return { success: true };
    } catch (err: any) {
      console.error(`[BROWSER_ERROR] Click failed: ${err.message}`);
      
      try {
        await this.captureScreenshot(sessionId, 'failure');
      } catch (screenshotErr) {
        console.error('[BROWSER_ERROR] Failed to capture failure screenshot', screenshotErr);
      }
      
      await supabase
        .from('browser_actions')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', actionRecord.id);
      
      if (err instanceof BrowserActionError) throw err;
      throw new BrowserActionError(err.message, 'click', err);
    }
  },

  /**
   * Types text into a field using real Playwright selectors.
   */
  async type(sessionId: string, selector: string, text: string) {
    const action = { type: 'type', selector, payload: { text: '********' } };
    
    // 1. SAFETY CHECK
    const safety = await browserSafetyGuard.isActionSafe(sessionId, action);
    if (!safety.safe) throw new BrowserActionError(`Safety Violation: ${safety.reason}`, 'type');

    const supabase = createAdminClient();
    const { page, context } = await this.getSession(sessionId);
    
    const { data: actionRecord } = await supabase
      .from('browser_actions')
      .insert([{
        session_id: sessionId,
        action_type: 'type',
        selector,
        payload: { text: '********' },
        status: 'pending'
      }])
      .select()
      .single();

    try {
      console.log(`[BROWSER] Typing into ${selector}...`);
      
      await this.captureScreenshot(sessionId, 'start');
      
      await timeoutPromise(
        retryWithBackoff(async () => {
          await page.fill(selector, text, { timeout: RETRY_CONFIG.timeoutMs });
        }),
        RETRY_CONFIG.timeoutMs
      );
      
      // 2. PERSIST STATE
      await this.persistState(sessionId, page, context);
      
      await supabase
        .from('browser_actions')
        .update({ status: 'completed' })
        .eq('id', actionRecord.id);
      
      await this.captureScreenshot(sessionId, 'final');
      
      return { success: true };
    } catch (err: any) {
      console.error(`[BROWSER_ERROR] Type failed: ${err.message}`);
      
      try {
        await this.captureScreenshot(sessionId, 'failure');
      } catch (screenshotErr) {
        console.error('[BROWSER_ERROR] Failed to capture failure screenshot', screenshotErr);
      }
      
      await supabase
        .from('browser_actions')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', actionRecord.id);
      
      if (err instanceof BrowserActionError) throw err;
      throw new BrowserActionError(err.message, 'type', err);
    }
  },

  /**
   * Closes the browser instance.
   */
  async close(sessionId: string) {
    const session = sessions.get(sessionId);
    if (session) {
      await session.browser.close();
      sessions.delete(sessionId);
      await browserSessionManager.closeSession(sessionId);
      console.log(`[BROWSER] Session ${sessionId} closed.`);
    }
  },

  /**
   * Closes all active sessions
   */
  async closeAll() {
    console.log('[BROWSER] Closing all active sessions...');
    const sessionIds = Array.from(sessions.keys());
    await Promise.all(sessionIds.map(id => this.close(id)));
  }
};
