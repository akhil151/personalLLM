import { IAgent, AgentInput, AgentOutput, agentRegistry } from '@/orchestrator/agentRegistry';
import { llmService } from '@/services/llmService';
import { orchestratorService } from '@/orchestrator/orchestratorService';

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
    const { runId, data } = input;
    const { action_to_review, output_to_review } = data;

    await orchestratorService.logStep(runId, this.name, 'thought', `Reviewing output for potential issues.`);

    const systemPrompt = `You are an AI Quality & Safety Critic. 
    Evaluate the provided agent output for accuracy, safety, and goal alignment.
    
    Structure your response as a JSON object:
    {
      "verdict": "pass|fail|needs_revision",
      "score": 0-100,
      "concerns": ["list of issues found"],
      "suggestions": ["how to improve the output"]
    }`;

    try {
      const result = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Action: ${JSON.stringify(action_to_review)}\nOutput: ${JSON.stringify(output_to_review)}` }
      ], {});

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

agentRegistry.register(new CriticAgent());
