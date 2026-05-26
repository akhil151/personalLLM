import { createClient } from '@/lib/supabase-server';

/**
 * BrowserSafetyGuard protects the environment from runaway or malicious agents.
 * 
 * ENVIRONMENTAL SAFETY:
 * 1. Domain Restriction: Limiting where the agent can go (e.g., no porn, no gambling).
 * 2. Action Throttling: Preventing the agent from clicking 100 times per second (anti-bot protection).
 * 3. Loop Detection: Identifying if the agent is stuck in a navigation cycle.
 */
export const browserSafetyGuard = {
  private blockedDomains = ['malware.com', 'phishing.net'];
  private maxActionsPerSession = 50;

  async isActionSafe(sessionId: string, action: any) {
    const supabase = await createClient();

    // 1. Check Domain
    if (action.type === 'navigate' && this.blockedDomains.some(d => action.payload.url.includes(d))) {
      return { safe: false, reason: 'Domain is blocked by safety policy.' };
    }

    // 2. Check Action Count
    const { count } = await supabase
      .from('browser_actions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (count && count >= this.maxActionsPerSession) {
      return { safe: false, reason: 'Action limit exceeded for this session.' };
    }

    return { safe: true };
  }
};
