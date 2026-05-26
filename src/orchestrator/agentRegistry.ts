export type AgentRole = 'planner' | 'memory' | 'executor';

export interface AgentInput {
  runId: string;
  conversationId: string;
  userId: string;
  data: any;
}

export interface AgentOutput {
  success: boolean;
  data: any;
  error?: string;
  nextStep?: string;
}

export interface IAgent {
  name: string;
  role: AgentRole;
  execute(input: AgentInput): Promise<AgentOutput>;
}

class AgentRegistry {
  private agents: Map<AgentRole, IAgent> = new Map();

  register(agent: IAgent) {
    this.agents.set(agent.role, agent);
    console.log(`Agent registered: ${agent.name} (${agent.role})`);
  }

  getAgent(role: AgentRole): IAgent | undefined {
    return this.agents.get(role);
  }

  getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }
}

export const agentRegistry = new AgentRegistry();
