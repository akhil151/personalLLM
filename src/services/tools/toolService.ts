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
    return { success: true, data: [] }; // Placeholder for actual retrieval
  },
  summarize_conversation: async (args) => {
    console.log('EXECUTING TOOL: summarize_conversation', args);
    return { success: true, summary: "This is a placeholder summary." };
  },
  fetch_user_data: async (args) => {
    console.log('EXECUTING TOOL: fetch_user_data', args);
    return { success: true, profile: { name: "User", preferences: ["ML", "AI"] } };
  },
  generate_learning_plan: async (args) => {
    console.log('EXECUTING TOOL: generate_learning_plan', args);
    return { success: true, plan: [`Learn ${args.topic} basics`, `Deep dive into ${args.topic}`] };
  },
  schedule_task: async (args) => {
    console.log('EXECUTING TOOL: schedule_task', args);
    return { success: true, scheduled: true };
  }
};
