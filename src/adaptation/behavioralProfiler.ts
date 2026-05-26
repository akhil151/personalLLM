import { createClient } from '@/lib/supabase-server';

/**
 * behavioralProfiler.ts
 * Identifies and tracks recurring user behavior patterns.
 */
export class BehavioralProfiler {
  /**
   * Records an observed behavior and updates pattern statistics.
   */
  public static async recordObservation(userId: string, patternType: string, description: string) {
    const supabase = await createClient();

    // 1. Check if a similar pattern already exists
    const { data: existing, error: fetchError } = await supabase
      .from('behavior_patterns')
      .select('*')
      .eq('user_id', userId)
      .eq('pattern_type', patternType)
      .eq('description', description)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) {
      // 2. Update existing pattern
      const newFrequency = existing.frequency + 1;
      const newConfidence = Math.min(existing.confidence + 0.05, 1.0); // Increase confidence with frequency

      await supabase
        .from('behavior_patterns')
        .update({
          frequency: newFrequency,
          confidence: newConfidence,
          last_observed_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // 3. Insert new pattern
      await supabase
        .from('behavior_patterns')
        .insert([{
          user_id: userId,
          pattern_type: patternType,
          description,
          confidence: 0.1, // Initial low confidence
          frequency: 1
        }]);
    }
  }

  /**
   * Retrieves high-confidence patterns for the user.
   */
  public static async getActivePatterns(userId: string, minConfidence: number = 0.5) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('behavior_patterns')
      .select('*')
      .eq('user_id', userId)
      .gte('confidence', minConfidence)
      .order('confidence', { ascending: false });

    if (error) throw error;
    return data;
  }
}
