import { createClient } from '@/lib/supabase-server';

/**
 * institutionalKnowledgeBase.ts
 * Manages the repository of validated operational playbooks and strategies.
 */
export class InstitutionalKnowledgeBase {
  /**
   * Registers a validated playbook.
   */
  public static async registerPlaybook(name: string, trigger: string, actions: any[]) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('operational_playbooks')
      .insert([{
        name,
        context_trigger: trigger,
        actions_list: actions,
        version: 1
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Finds the best playbook for a given context.
   */
  public static async findPlaybook(context: string) {
    const supabase = await createClient();

    // Semantic search for playbooks
    const { data: playbooks } = await supabase
      .from('operational_playbooks')
      .select('*');

    // Simple filter for now
    return playbooks?.find(p => context.toLowerCase().includes(p.context_trigger.toLowerCase()));
  }
}
