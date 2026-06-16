export type AgentRole = 'planner' | 'memory' | 'executor' | 'browser' | 'research' | 'critic';

export interface AgentInput {
  runId: string;
  conversationId: string;
  userId: string;
  data: any;
  cos_context?: any;
}

export interface AgentOutput {
  success: boolean;
  data: any;
  error?: string;
  nextStep?: string;
  source: 'llm' | 'fallback' | 'error';
  fallback_used: boolean;
  model_used?: string;
  execution_time: number;
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

  logRegisteredAgents() {
    const registeredRoles = Array.from(this.agents.keys());
    console.log('Registered Agents:', JSON.stringify(registeredRoles, null, 2));
  }

  listAgents(): AgentRole[] {
    return Array.from(this.agents.keys());
  }

  getAgent(role: AgentRole): IAgent | undefined {
    return this.agents.get(role);
  }

  getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }
}

export const agentRegistry = new AgentRegistry();

// Automatically register all agents when the module is loaded
console.log("Registry loaded");

// Import agents synchronously to ensure they register before the module finishes loading
require('../agents');

agentRegistry.logRegisteredAgents();
