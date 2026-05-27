import { createAdminClient } from '@/lib/supabase-admin';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { browserSafetyGuard } from '@/safety/browserSafetyGuard';

// In-memory store for active browser instances (Cache)
const sessions = new Map<string, { browser: Browser, context: BrowserContext, page: Page }>();

/**
 * BrowserRuntime is the execution engine for real-world environmental interaction.
 * Now stabilized with:
 * 1. Runtime Safety Governance
 * 2. Session Durability (StorageState persistence)
 * 3. Fault-tolerant session recovery
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

      session = { browser, context, page };
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

  /**
   * Navigates to a URL using real Playwright.
   */
  async navigate(sessionId: string, url: string) {
    const action = { type: 'navigate', payload: { url } };
    
    // 1. SAFETY CHECK
    const safety = await browserSafetyGuard.isActionSafe(sessionId, action);
    if (!safety.safe) throw new Error(`Safety Violation: ${safety.reason}`);

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
      
      // 3. REAL NAVIGATION
      await page.goto(url, { waitUntil: 'networkidle' });

      // 4. PERSIST STATE FOR DURABILITY
      await this.persistState(sessionId, page, context);

      // 5. Update Action
      await supabase
        .from('browser_actions')
        .update({ status: 'completed' })
        .eq('id', actionRecord.id);

      // 6. Create REAL Page Snapshot
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
      const base64Screenshot = screenshot.toString('base64');
      const title = await page.title();

      await supabase
        .from('page_snapshots')
        .insert([{
          session_id: sessionId,
          url,
          title,
          screenshot_url: `data:image/jpeg;base64,${base64Screenshot}`,
          perception_data: { 
            type: 'page_load', 
            content_length: (await page.content()).length 
          }
        }]);

      return { success: true, url, title };

    } catch (err: any) {
      console.error(`[BROWSER ERROR] Navigation failed: ${err.message}`);
      await supabase
        .from('browser_actions')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', actionRecord.id);
      throw err;
    }
  },

  /**
   * Clicks an element using real Playwright selectors.
   */
  async click(sessionId: string, selector: string) {
    const action = { type: 'click', selector };
    
    // 1. SAFETY CHECK
    const safety = await browserSafetyGuard.isActionSafe(sessionId, action);
    if (!safety.safe) throw new Error(`Safety Violation: ${safety.reason}`);

    const supabase = createAdminClient();
    const { page, context } = await this.getSession(sessionId);
    
    await supabase
      .from('browser_actions')
      .insert([{
        session_id: sessionId,
        action_type: 'click',
        selector,
        status: 'pending'
      }]);

    try {
      console.log(`[BROWSER] Clicking ${selector}...`);
      await page.click(selector);
      
      // 2. PERSIST STATE
      await this.persistState(sessionId, page, context);
      
      return { success: true };
    } catch (err: any) {
      console.error(`[BROWSER ERROR] Click failed: ${err.message}`);
      throw err;
    }
  },

  /**
   * Types text into a field using real Playwright.
   */
  async type(sessionId: string, selector: string, text: string) {
    const action = { type: 'type', selector, payload: { text: '********' } };
    
    // 1. SAFETY CHECK
    const safety = await browserSafetyGuard.isActionSafe(sessionId, action);
    if (!safety.safe) throw new Error(`Safety Violation: ${safety.reason}`);

    const supabase = createAdminClient();
    const { page, context } = await this.getSession(sessionId);
    
    await supabase
      .from('browser_actions')
      .insert([{
        session_id: sessionId,
        action_type: 'type',
        selector,
        payload: { text: '********' },
        status: 'pending'
      }]);

    try {
      console.log(`[BROWSER] Typing into ${selector}...`);
      await page.fill(selector, text);
      
      // 2. PERSIST STATE
      await this.persistState(sessionId, page, context);
      
      return { success: true };
    } catch (err: any) {
      console.error(`[BROWSER ERROR] Type failed: ${err.message}`);
      throw err;
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
      console.log(`[BROWSER] Session ${sessionId} closed.`);
    }
  }
};
