import { createClient } from '@/lib/supabase-server';

/**
 * reusableSkillRegistry.ts
 * Manages the registration and discovery of learned operational skills.
 */
export class ReusableSkillRegistry {
  /**
   * Registers a new learned skill.
   */
  public static async registerSkill(params: {
    userId: string;
    name: string;
    description: string;
    definition: any;
  }) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('learned_skills')
      .insert([{
        user_id: params.userId,
        name: params.name,
        description: params.description,
        definition: params.definition,
        competence_level: 0.1, // Start with low competence
        usage_count: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Finds the best skill for a given context.
   */
  public static async findRelevantSkill(userId: string, context: string) {
    const supabase = await createClient();

    // Semantic search would be better here, using embeddings.
    const { data: skills } = await supabase
      .from('learned_skills')
      .select('*')
      .eq('user_id', userId)
      .order('success_rate', { ascending: false });

    return skills?.filter(s => s.name.toLowerCase().includes(context.toLowerCase()) || 
                               s.description.toLowerCase().includes(context.toLowerCase()));
  }
}
