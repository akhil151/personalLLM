import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { browserSessionManager } from './browserSessionManager';
import { browserRuntime } from './browserRuntime';
import { visionService } from '@/vision/visionService';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * BrowserAgent is an Operational AI capable of interacting with the web.
 * 
 * THE BROWSER LOOP:
 * 1. PERCEIVE: Get a screenshot and DOM state.
 * 2. REASON: Use Vision + LLM to decide the next move.
 * 3. ACT: Click, type, or navigate.
 * 4. OBSERVE: Verify the result and update memory.
 */
export class BrowserAgent implements IAgent {
  name = 'Browser Agent';
  role = 'browser' as const;

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { runId, userId, data } = input;
    const { task, goal } = data;

    await orchestratorService.logStep(runId, this.name, 'thought', `Initializing browser session for task: ${task.title}`);

    try {
      // 1. Manage Session
      let session = await browserSessionManager.getActiveSession(userId, runId);
      if (!session) {
        session = await browserSessionManager.createSession(userId, runId);
      }

      // 2. Initial Navigation (if URL provided)
      const urlMatch = task.description.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : null;
      if (url) {
        await browserRuntime.navigate(session.id, url);
      }

      // 3. Multimodal Perception Loop
      // Fetch the latest snapshot for this session
      const supabase = createAdminClient();
      const { data: snapshot } = await supabase
        .from('page_snapshots')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const screenshotUrl = snapshot?.screenshot_url || `https://placehold.co/1280x720?text=No+Screenshot+Available`;
      const perception = await visionService.analyzeScreenshot(screenshotUrl, goal);

      await orchestratorService.logStep(runId, this.name, 'observation', `Perception: ${perception.page_summary}`, null, perception);

      // 4. Action Execution
      if (perception.suggested_action && perception.suggested_action.type !== 'none') {
        const action = perception.suggested_action;
        await orchestratorService.logStep(runId, this.name, 'action', `Executing ${action.type} on ${action.target}`, null, action);

        switch (action.type) {
          case 'click':
            await browserRuntime.click(session.id, action.target);
            break;
          case 'type':
            await browserRuntime.type(session.id, action.target, action.value);
            break;
        }
      }

      return {
        success: true,
        data: {
          summary: perception.page_summary,
          last_action: perception.suggested_action
        }
      };

    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}

// Register the agent
// Note: We might want a dedicated 'browser' role in a real multi-agent registry.
agentRegistry.register(new BrowserAgent());
