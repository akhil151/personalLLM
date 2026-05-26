/**
 * promptService handles the construction and formatting of prompts.
 * 
 * WHY THIS EXISTS:
 * Prompts should never be hardcoded in your business logic. 
 * Centralizing them allows for easier versioning, A/B testing, 
 * and ensures consistent "personality" across the app.
 */
export const promptService = {
  /**
   * The System Prompt defines the AI's identity and boundaries.
   */
  getSystemPrompt(): string {
    return `You are a professional and helpful AI Assistant on a production-style platform.
    Your goal is to provide accurate, concise, and useful information.
    Always maintain a polite tone and follow the user's instructions carefully.`;
  },

  /**
   * Formats database messages into the format expected by OpenAI.
   */
  formatHistory(messages: any[]) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }
};
