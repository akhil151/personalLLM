import { openaiService } from '@/services/openaiService';

/**
 * VisionService provides the "Multimodal Perception" layer.
 * 
 * WHY MULTIMODAL?
 * For an AI to interact with the world (like a browser), it must "see" the UI.
 * 1. Screenshot Analysis: Understanding the layout and elements of a page.
 * 2. Visual Reasoning: Detecting error messages, modals, or loading spinners.
 * 3. Spatial Awareness: Knowing where to click based on visual coordinates.
 */
export const visionService = {
  /**
   * Analyzes a screenshot to understand the current page state.
   */
  async analyzeScreenshot(imageUrl: string, goal: string) {
    console.log(`Analyzing screenshot: ${imageUrl}`);

    const systemPrompt = `You are a Multimodal UI Specialist.
    Analyze the provided screenshot of a web browser.
    GOAL: ${goal}
    
    Identify:
    1. Interactive elements (buttons, inputs, links).
    2. Current page state (loading, error, success).
    3. Suggested next action to achieve the goal.
    
    Return JSON:
    {
      "page_summary": "...",
      "interactive_elements": [{ "type": "...", "label": "...", "selector": "..." }],
      "suggested_action": { "type": "click|type|scroll", "target": "selector", "value": "..." },
      "visual_errors": []
    }`;

    try {
      // In a real system, we'd send the image to gpt-4o via openaiService.
      // Since I'm simulating, I'll return a structured mock response.
      const perception = await openaiService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze the current browser state for goal: ${goal}` }
      ], {});

      return perception;

    } catch (err) {
      console.error('Vision Analysis Error:', err);
      return { page_summary: 'Failed to analyze screenshot visually.', interactive_elements: [] };
    }
  }
};
