import { createClient } from '@/lib/supabase-server';

/**
 * GraphMemoryService implements Relational Cognition.
 * 
 * WHY A KNOWLEDGE GRAPH?
 * Vector memory (RAG) is great for similarity, but bad at "relationships."
 * A Knowledge Graph allows the AI to understand:
 * - "User X is working on Project Y."
 * - "Project Y depends on Skill Z."
 * - "Skill Z was mentioned in Document A."
 * 
 * This provides a structured "world model" for the agent.
 */
export const graphMemoryService = {
  /**
   * Adds or updates an entity in the Knowledge Graph.
   */
  async upsertEntity(userId: string, name: string, type: string, metadata: any = {}) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('kg_entities')
      .upsert({
        user_id: userId,
        name,
        entity_type: type,
        metadata,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,name,entity_type' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Creates a relationship between two entities.
   */
  async connect(userId: string, sourceId: string, targetId: string, type: string, metadata: any = {}) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('kg_relationships')
      .upsert({
        user_id: userId,
        source_id: sourceId,
        target_id: targetId,
        relationship_type: type,
        metadata
      }, { onConflict: 'user_id,source_id,target_id,relationship_type' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Retrieves the local "neighborhood" of an entity.
   */
  async getNeighborhood(userId: string, entityId: string) {
    const supabase = await createClient();

    const { data: outgoing } = await supabase
      .from('kg_relationships')
      .select('*, target:kg_entities!target_id(*)')
      .eq('source_id', entityId);

    const { data: incoming } = await supabase
      .from('kg_relationships')
      .select('*, source:kg_entities!source_id(*)')
      .eq('target_id', entityId);

    return { outgoing, incoming };
  }
};
