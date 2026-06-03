import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { openaiService } from '@/services/openaiService';
import { orchestratorService } from '@/orchestrator/orchestratorService';

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
    const { runId, data } = input;
    const { topic, context } = data;

    await orchestratorService.logStep(runId, this.name, 'thought', `Synthesizing research for topic: "${topic}"`);

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

    try {
      const result = await openaiService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Topic: ${topic}\nContext: ${JSON.stringify(context)}` }
      ], {});

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
        data: result
      };

    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}

agentRegistry.register(new ResearchAgent());
