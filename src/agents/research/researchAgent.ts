import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { llmService } from '@/services/llmService';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { z } from 'zod';

const ResearchSchema = z.object({
  summary: z.string(),
  findings: z.array(z.object({
    point: z.string(),
    source: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  gaps: z.array(z.string()),
  recommendations: z.array(z.string())
});

/**
 * ResearchAgent is responsible for deep-dive information gathering.
 * 
 * WHY RESEARCH AGENT?
 * Unlike the Planner, the Research Agent focuses on synthesizing multiple 
 * sources of information (Browser, Memory, MCP) into a cohesive report.
 */
export class ResearchAgent implements IAgent {
  name = 'Research Agent';
  role = 'research' as const;

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { runId, data } = input;
    const { topic, context } = data;

    if (!topic) {
      return {
        success: false,
        data: null,
        error: 'Research Agent: Missing "topic" in input data.',
        source: 'error',
        fallback_used: false,
        execution_time: Date.now() - startTime
      };
    }

    await orchestratorService.logStep(runId, this.name, 'thought', `Synthesizing research for topic: "${topic}"`);

    try {
      const systemPrompt = `You are a Senior Research AI. Your goal is to provide a comprehensive, 
      fact-checked report on a given topic based on the provided context.
      
      Structure your response as a JSON object:
      {
        "summary": "High-level overview",
        "findings": [
          { "point": "...", "source": "...", "confidence": 0.0-1.0 }
        ],
        "gaps": ["what information is still missing"],
        "recommendations": ["next steps for the user"]
      }`;

      const result = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Topic: ${topic}\nContext: ${JSON.stringify(context)}` }
      ], ResearchSchema);

      await orchestratorService.logStep(runId, this.name, 'observation', `Research synthesis complete.`);

      // PHASE Y.1 ACTIVATION: Send to Critic Agent for review
      await orchestratorService.sendAgentMessage(
        runId,
        this.name,
        'Critic Agent',
        `Research complete. Please review findings for: ${topic}`,
        { findings: result }
      );

      return {
        success: true,
        data: result,
        source: 'llm',
        fallback_used: false,
        execution_time: Date.now() - startTime
      };

    } catch (error: any) {
      console.warn(`[RESEARCH] Research failed: ${error.message}`);
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'error',
        fallback_used: false,
        execution_time: Date.now() - startTime
      };
    }
  }
}

agentRegistry.register(new ResearchAgent());
