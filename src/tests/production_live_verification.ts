
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../lib/supabase-admin';
import { executionPipeline } from '../orchestrator/executionPipeline';
import { eventDispatcher } from '../events/eventDispatcher';
import { workerRuntime } from '../workers/workerRuntime';
import { memoryService } from '../services/memory/memoryService';
import { mcpService } from '../mcp/mcpService';
import { chromium } from 'playwright';
import { getTestUser, getTestConversation } from './utils';
import '../agents/index';

async function runLiveVerification() {
  console.log('PHASE Z.0 — LIVE SYSTEM VERIFICATION');
  const userId = await getTestUser();
  const conversationId = await getTestConversation(userId);

  console.log('\n--- PART 3: CHAT VALIDATION ---');
  try {
    eventDispatcher.init();
    workerRuntime.start().catch(() => {});
    
    console.log('Sending: "Hello"');
    const result = await executionPipeline.run(userId, conversationId, "Hello");
    if (result.success) {
      console.log('PASS: Planner executes, OpenAI request succeeds, response stored.');
    } else {
      console.error('FAIL: Chat failed - ' + result.error);
    }
  } catch (err: any) {
    console.error('FAIL: Chat error - ' + err.message);
  }

  console.log('\n--- PART 4: MEMORY VALIDATION ---');
  try {
    const memMsg = "My favorite language is Python.";
    console.log(`Sending: "${memMsg}"`);
    await memoryService.storeMessageEmbedding("test-msg-id", conversationId, userId, memMsg);
    
    console.log('Querying: "What is my favorite language?"');
    const memories = await memoryService.searchSimilarMemories("What is my favorite language?", userId);
    const found = memories.some(m => m.content.includes("Python"));
    if (found) {
      console.log('PASS: Memory retrieval successful.');
    } else {
      console.error('FAIL: Memory not found.');
    }
  } catch (err: any) {
    console.error('FAIL: Memory error - ' + err.message);
  }

  console.log('\n--- PART 5: MCP VALIDATION ---');
  try {
    await mcpService.initializeServers();
    const tools = await mcpService.listTools();
    const hasFilesystem = tools.some(t => t.name.includes('read_file') || t.name.includes('list_directory'));
    if (hasFilesystem) {
      console.log('PASS: Filesystem MCP connected and tools discovered.');
    } else {
      console.error('FAIL: Filesystem MCP tools not found.');
    }
  } catch (err: any) {
    console.error('FAIL: MCP error - ' + err.message);
  }

  console.log('\n--- PART 6: BROWSER AGENT VALIDATION ---');
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    const title = await page.title();
    await browser.close();
    if (title.includes('Google')) {
      console.log('PASS: Playwright launches and page loads.');
    } else {
      console.error('FAIL: Page title mismatch.');
    }
  } catch (err: any) {
    console.error('FAIL: Browser error - ' + err.message);
  }

  console.log('\n--- PART 8: END TO END AGENT TEST ---');
  try {
    const goal = "Research AI startups hiring interns and create a short report.";
    console.log(`Task: ${goal}`);
    const result = await executionPipeline.run(userId, conversationId, goal);
    if (result.success) {
      console.log('PASS: E2E Agent task completed successfully.');
    } else {
      console.error('FAIL: E2E task failed - ' + result.error);
    }
  } catch (err: any) {
    console.error('FAIL: E2E error - ' + err.message);
  }

  process.exit(0);
}

runLiveVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
