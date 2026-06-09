import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../lib/supabase-admin';
import { mcpService } from '../mcp/mcpService';
import { chromium } from 'playwright';

async function runHealthCheck() {
  console.log('--- PART 6: ENVIRONMENT HEALTH CHECK ---');
  let overallStatus = 'HEALTHY';

  // 1. Check LLM Keys
  if (!process.env.GROQ_API_KEY) {
    console.error('[CRITICAL] GROQ_API_KEY is missing');
    overallStatus = 'CRITICAL';
  } else {
    console.log('[OK] GROQ_API_KEY found');
  }

  if (!process.env.OLLAMA_BASE_URL) {
    console.warn('[WARNING] OLLAMA_BASE_URL is missing, using default');
  } else {
    console.log('[OK] OLLAMA_BASE_URL found');
  }

  // 2. Check Supabase
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('[CRITICAL] SUPABASE_URL is missing');
    overallStatus = 'CRITICAL';
  } else {
    console.log('[OK] SUPABASE_URL found');
  }

  // 3. Check Supabase Admin Key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[WARNING] SUPABASE_SERVICE_ROLE_KEY is missing (using anon key fallback)');
    if (overallStatus === 'HEALTHY') overallStatus = 'WARNING';
  } else {
    console.log('[OK] SUPABASE_SERVICE_ROLE_KEY found');
  }

  // 4. Check Playwright Browsers
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    console.log('[OK] Playwright Chromium operational');
  } catch (err: any) {
    console.error(`[CRITICAL] Playwright failure: ${err.message}`);
    overallStatus = 'CRITICAL';
  }

  // 5. Check MCP Servers
  try {
    // This will hit the DB (or mock)
    await mcpService.initializeServers();
    console.log('[OK] MCP Service initialized');
  } catch (err: any) {
    console.warn(`[WARNING] MCP initialization issues: ${err.message}`);
    if (overallStatus === 'HEALTHY') overallStatus = 'WARNING';
  }

  console.log(`\nFINAL SYSTEM STATUS: ${overallStatus}`);
  process.exit(overallStatus === 'CRITICAL' ? 1 : 0);
}

runHealthCheck();
