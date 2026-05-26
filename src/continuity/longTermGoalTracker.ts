import { createClient } from '@/lib/supabase-server';

/**
 * longTermGoalTracker.ts
 * Manages the evolution and persistence of multi-session goals.
 */
export class LongTermGoalTracker {
  /**
   * Fetches active long-term goals for a user.
   */
  public static async getActiveGoals(userId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('goal_evolution')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('priority_weight', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Evolves a goal based on new information or progress.
   */
  public static async evolveGoal(userId: string, oldGoalId: string, newGoalText: string) {
    const supabase = await createClient();

    // 1. Mark old goal as evolved
    await supabase
      .from('goal_evolution')
      .update({ status: 'evolved' })
      .eq('id', oldGoalId);

    // 2. Create new goal linked to the old one
    const { data: oldGoal } = await supabase
      .from('goal_evolution')
      .select('evolution_path')
      .eq('id', oldGoalId)
      .single();

    const newPath = [...(oldGoal?.evolution_path || []), oldGoalId];

    const { data: newGoal, error } = await supabase
      .from('goal_evolution')
      .insert([{
        user_id: userId,
        goal_text: newGoalText,
        status: 'active',
        evolution_path: newPath
      }])
      .select()
      .single();

    if (error) throw error;
    return newGoal;
  }
}
