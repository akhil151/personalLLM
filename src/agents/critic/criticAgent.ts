import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { llmService } from '@/services/llmService';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { z } from 'zod';

const CriticSchema = z.object({
  verdict: z.enum(['pass', 'fail', 'needs_revision']),
  score: z.number().min(0).max(100),
  concerns: z.array(z.string()),
  suggestions: z.array(z.string())
});

/**
 * CriticAgent provides quality assurance and safety checks.
 * 
 * WHY CRITIC AGENT?
 * It acts as an adversarial/evaluative layer, checking the work of other agents 
 * for hallucinations, logical errors, or safety violations.
 */
export class CriticAgent implements IAgent {
  name = 'Critic Agent';
  role = 'critic' as const;

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { runId, data } = input;
    const { action_to_review, output_to_review } = data;

    // Validate inputs
    if (!action_to_review) {
      return {
        success: false,
        data: null,
        error: 'Critic Agent: Missing "action_to_review" in input data.',
        source: 'error',
        fallback_used: false,
        execution_time: Date.now() - startTime
      };
    }
    if (!output_to_review) {
      return {
        success: false,
        data: null,
        error: 'Critic Agent: Missing "output_to_review" in input data.',
        source: 'error',
        fallback_used: false,
        execution_time: Date.now() - startTime
      };
    }

    await orchestratorService.logStep(runId, this.name, 'thought', `Reviewing output for potential issues.`);

    try {
      const systemPrompt = `You are an AI Quality & Safety Critic. 
      Evaluate the provided agent output for accuracy, safety, and goal alignment.
      
      Structure your response as a JSON object:
      {
        "verdict": "pass|fail|needs_revision",
        "score": 0-100,
        "concerns": ["list of issues found"],
        "suggestions": ["how to improve the output"]
      }`;

      const result = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Action: ${JSON.stringify(action_to_review)}\nOutput: ${JSON.stringify(output_to_review)}` }
      ], CriticSchema);

      await orchestratorService.logStep(runId, this.name, 'observation', `Critic review complete: ${result.verdict}`);

      // PHASE Y.1 ACTIVATION: Send feedback back to the workflow
      await orchestratorService.sendAgentMessage(
        runId,
        this.name,
        'Orchestrator',
        `Review verdict: ${result.verdict}`,
        { review: result }
      );

      return {
        success: true,
        data: result,
        source: 'llm',
        fallback_used: false,
        execution_time: Date.now() - startTime
      };

    } catch (error: any) {
      console.warn(`[CRITIC] Review failed: ${error.message}`);
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

agentRegistry.register(new CriticAgent());
