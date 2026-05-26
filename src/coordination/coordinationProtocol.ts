/**
 * coordinationProtocol.ts
 * Defines the formal protocols for multi-agent interaction and conflict resolution.
 */
export class CoordinationProtocol {
  /**
   * Resolves a conflict between two agents vying for the same resource.
   */
  public static resolveResourceConflict(agentA: string, agentB: string, resource: string) {
    // Priority-based resolution
    const priorities: Record<string, number> = {
      'planner': 10,
      'browser': 5,
      'executor': 3,
      'memory': 8
    };

    const winner = (priorities[agentA] || 0) >= (priorities[agentB] || 0) ? agentA : agentB;
    
    return {
      winner,
      action: winner === agentA ? 'proceed' : 'wait',
      reasoning: `Priority of ${agentA} is ${priorities[agentA]}, ${agentB} is ${priorities[agentB]}`
    };
  }

  /**
   * Defines the standard response format for agent-to-agent requests.
   */
  public static createHandshake(agentName: string) {
    return {
      agent: agentName,
      protocolVersion: '1.0',
      capabilities: ['request_task', 'report_status', 'share_knowledge']
    };
  }
}
