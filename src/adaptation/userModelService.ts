import { createClient } from '@/lib/supabase-server';

/**
 * userModelService.ts
 * Manages the persistence and retrieval of longitudinal user cognitive profiles.
 */
export class UserModelService {
  /**
   * Retrieves the complete cognitive profile for a user.
   */
  public static async getProfile(userId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
    return data;
  }

  /**
   * Updates specific attributes of the user profile.
   */
  public static async updateProfile(userId: string, updates: any) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Records a goal evolution event.
   */
  public static async trackGoalEvolution(userId: string, goalText: string, status: string, evolutionPath: string[] = []) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('goal_evolution')
      .insert([{
        user_id: userId,
        goal_text: goalText,
        status,
        evolution_path: evolutionPath
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
