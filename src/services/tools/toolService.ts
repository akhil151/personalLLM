import { createAdminClient } from '@/lib/supabase-admin';
import { memoryService } from '../memory/memoryService';
import { llmService } from '../llmService';
import { userIntelligenceService } from '../userIntelligenceService';
import { behaviorAnalyzer } from '../behaviorAnalyzer';
import { goalManagerService } from '../goalManagerService';
import { jarvisReflectionService } from '../jarvisReflectionService';
import { z } from 'zod';

/**
 * ToolRegistry defines the available functions the AI can call.
 * 
 * WHY STRUCTURED OUTPUTS MATTER:
 * Plain text is hard for computers to parse. 
 * By using tool calling (JSON), the AI can "click buttons" 
 * and "run code" in your system safely.
 */
export const tools = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task in the system',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The title of the task' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_memories',
      description: 'Search past conversations for specific information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_conversation',
      description: 'Generate a summary of the current conversation',
      parameters: {
        type: 'object',
        properties: {
          conversation_id: { type: 'string' },
        },
        required: ['conversation_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_user_data',
      description: 'Retrieve user profile and preference data',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
        },
        required: ['user_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_learning_plan',
      description: 'Create a structured learning roadmap for a specific topic',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_research_report',
      description: 'Save a structured research report to the knowledge base',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          source_urls: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'content'],
      },
    },
  }
];

export const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  save_research_report: async (args) => {
    console.log('EXECUTING TOOL: save_research_report', args);
    // In production, this would call ingestionService
    return { success: true, message: `Report "${args.title}" saved successfully.` };
  },
  create_task: async (args) => {
    console.log('EXECUTING TOOL: create_task', args);
    return { success: true, message: `Task "${args.title}" created successfully.` };
  },
  search_memories: async (args) => {
    console.log('EXECUTING TOOL: search_memories', args);
    const { query, user_id } = args;
    if (!user_id) return { success: false, error: 'user_id is required' };
    
    const memories = await memoryService.searchSimilarMemories(query, user_id);
    return { success: true, data: memories };
  },
  summarize_conversation: async (args) => {
    console.log('EXECUTING TOOL: summarize_conversation', args);
    const { conversation_id } = args;
    const supabase = createAdminClient();
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('content, role')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    if (error || !messages) return { success: false, error: error?.message || 'No messages found' };

    const prompt = `Summarize the following conversation in 2-3 concise sentences:\n\n${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;
    const summary = await llmService.getStructuredOutput([
      { role: 'system', content: 'You are a concise summarizer.' },
      { role: 'user', content: prompt }
    ], z.object({ summary: z.string() }));

    return { success: true, summary: summary.summary };
  },
  fetch_user_data: async (args) => {
    console.log('EXECUTING TOOL: fetch_user_data', args);
    const { user_id } = args;
    if (!user_id) return { success: false, error: 'user_id is required' };

    const [profile, behavior] = await Promise.all([
      userIntelligenceService.getUserProfile(user_id),
      behaviorAnalyzer.getBehaviorProfile(user_id)
    ]);

    return { success: true, profile, behavior };
  },
  generate_learning_plan: async (args) => {
    console.log('EXECUTING TOOL: generate_learning_plan', args);
    const { topic, user_id } = args;
    if (!user_id) return { success: false, error: 'user_id is required' };

    const [profile, goals, reflections] = await Promise.all([
      userIntelligenceService.getUserProfile(user_id),
      goalManagerService.getActiveGoals(user_id),
      jarvisReflectionService.getLatestReflections(5)
    ]);

    const context = { profile, goals, reflections, topic };
    const systemPrompt = `You are Jarvis, a Learning Architect. 
    Generate a personalized learning plan for the topic: "${topic}".
    Use the user's current focus, career goals, and past reflections to tailor the roadmap.`;

    const plan = await llmService.getStructuredOutput([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context: ${JSON.stringify(context)}` }
    ], z.object({
      plan: z.array(z.string()),
      reasoning: z.string()
    }));

    return { success: true, ...plan };
  },
  schedule_task: async (args) => {
    console.log('EXECUTING TOOL: schedule_task', args);
    return { success: true, scheduled: true };
  }
};
