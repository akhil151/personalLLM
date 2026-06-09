import { createAdminClient } from '../lib/supabase-admin';
import { mcpService } from '../mcp/mcpService';
import { chromium } from 'playwright';

/**
 * SystemHealthAudit Service
 * 
 * Performs startup validation of critical dependencies.
 * If critical dependencies are missing, it throws an error to halt startup.
 */
export class SystemHealthAudit {
  public static async run() {
    console.log('--- STARTING SYSTEM HEALTH AUDIT ---');
    
    const results = {
      ollama: await this.checkOllama(),
      groq: await this.checkGroq(),
      supabase: await this.checkSupabase(),
      playwright: await this.checkPlaywright(),
      mcp: await this.checkMCP(),
    };

    const criticalFailures = Object.entries(results)
      .filter(([_, status]) => status === 'CRITICAL')
      .map(([name]) => name);

    if (criticalFailures.length > 0) {
      const msg = `FATAL: Startup failed due to critical dependency failures: ${criticalFailures.join(', ')}`;
      console.error(msg);
      throw new Error(msg);
    }

    console.log('--- SYSTEM HEALTH AUDIT PASSED ---');
  }

  private static async checkOllama() {
    const start = Date.now();
    try {
      const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const model = process.env.OLLAMA_MODEL || 'qwen3:8b';

      // 1. Ping
      const pingRes = await fetch(`${baseUrl}/api/tags`);
      if (!pingRes.ok) throw new Error('Ollama ping failed');

      // 2. Warmup / Cache model load
      const warmupRes = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: 'hi',
          stream: false
        })
      });

      if (!warmupRes.ok) throw new Error(`Ollama warmup failed for model ${model}`);

      const loadTimeMs = Date.now() - start;
      console.log(`[OLLAMA_WARMUP] loadTimeMs: ${loadTimeMs}`);
      console.log(`[OK] Ollama verified and warmed up with ${model}`);
      return 'OK';
    } catch (err: any) {
      console.error(`[CRITICAL] Ollama failure: ${err.message}`);
      return 'CRITICAL';
    }
  }

  private static async checkGroq() {
    if (!process.env.GROQ_API_KEY) {
      console.error('[CRITICAL] GROQ_API_KEY is missing');
      return 'CRITICAL';
    }
    console.log('[OK] GROQ_API_KEY found');
    return 'OK';
  }

  private static async checkSupabase() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[CRITICAL] Supabase configuration missing');
      return 'CRITICAL';
    }
    
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from('mcp_servers').select('count', { count: 'exact', head: true });
      if (error) throw error;
      console.log('[OK] Supabase connection verified');
      return 'OK';
    } catch (err: any) {
      console.error(`[CRITICAL] Supabase connectivity failed: ${err.message}`);
      return 'CRITICAL';
    }
  }

  private static async checkPlaywright() {
    try {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      console.log('[OK] Playwright Chromium operational');
      return 'OK';
    } catch (err: any) {
      console.error(`[CRITICAL] Playwright failure: ${err.message}`);
      return 'CRITICAL';
    }
  }

  private static async checkMCP() {
    try {
      await mcpService.initializeServers();
      console.log('[OK] MCP Service initialized');
      return 'OK';
    } catch (err: any) {
      console.warn(`[WARNING] MCP initialization issues: ${err.message}`);
      // MCP is often considered non-critical for core platform boot, 
      // but we mark it as WARNING.
      return 'WARNING';
    }
  }
}
