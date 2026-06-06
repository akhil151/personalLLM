import { createAdminClient } from '@/lib/supabase-admin';

/**
 * BehaviorAnalyzer detects user working patterns and habits.
 */
export const behaviorAnalyzer = {
  async _getSupabase() {
    if (typeof window === 'undefined') {
      try {
        const { createClient } = await import('@/lib/supabase-server');
        return await createClient();
      } catch (err) {
        return createAdminClient();
      }
    } else {
      const { createClient } = await import('@/lib/supabase');
      return createClient();
    }
  },

  /**
   * Analyzes activity to detect behavioral patterns.
   */
  async analyzeBehavior(userId: string) {
    const supabase = await this._getSupabase();

    // 1. Fetch runs for pattern detection
    const { data: runs } = await supabase
      .from('agent_runs')
      .select('created_at, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!runs || runs.length === 0) return;

    // 2. Simple pattern detection logic
    const patterns = [];

    // Pattern: Time of day (Night Learner vs Day Worker)
    const hours = runs.map((r: any) => new Date(r.created_at).getHours());
    const avgHour = hours.reduce((a: number, b: number) => a + b, 0) / hours.length;
    
    if (avgHour > 20 || avgHour < 5) {
      patterns.push({
        type: 'preferred_time',
        value: { label: 'Night Learner', description: 'You perform most of your work during late hours.' },
        confidence: 0.8
      });
    } else {
      patterns.push({
        type: 'preferred_time',
        value: { label: 'Day Worker', description: 'You prefer working during standard daylight hours.' },
        confidence: 0.7
      });
    }

    // Pattern: Completion Rate
    const completed = runs.filter((r: any) => r.status === 'completed').length;
    const completionRate = completed / runs.length;
    
    patterns.push({
      type: 'completion_rate',
      value: { label: `${Math.round(completionRate * 100)}% Completion`, rate: completionRate },
      confidence: 0.9
    });

    // 3. Pattern: Preferred Tools
    const { data: steps } = await supabase
      .from('execution_steps')
      .select('tool_call')
      .not('tool_call', 'is', null);

    if (steps && steps.length > 0) {
      const toolCounts: Record<string, number> = {};
      steps.forEach((s: any) => {
        const name = (s.tool_call as any)?.function?.name || (s.tool_call as any)?.name;
        if (name) toolCounts[name] = (toolCounts[name] || 0) + 1;
      });
      const topTool = Object.entries(toolCounts).sort((a, b) => b[1] - a[1])[0];
      if (topTool) {
        patterns.push({
          type: 'preferred_tool',
          value: { label: `Power User: ${topTool[0]}`, description: `Your most used tool is ${topTool[0]}.` },
          confidence: 0.75
        });
      }
    }

    // 4. Store Patterns
    for (const pattern of patterns) {
      await supabase
        .from('jarvis_behavior_profile')
        .upsert({
          user_id: userId,
          pattern_type: pattern.type,
          pattern_value: pattern.value,
          confidence: pattern.confidence,
          last_updated: new Date().toISOString()
        });
    }

    return patterns;
  },

  async getBehaviorProfile(userId: string) {
    const supabase = await this._getSupabase();
    const { data, error } = await supabase
      .from('jarvis_behavior_profile')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }
};
