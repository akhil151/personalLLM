import { CapabilityNegotiator } from './capabilityNegotiator';
import { InterAgentCommunication } from './interAgentCommunication';

/**
 * distributedTaskAllocator.ts
 * Distributes subtasks across a federated network of agents.
 */
export class DistributedTaskAllocator {
  /**
   * Allocates a set of tasks to the best available agents.
   */
  public static async allocateTasks(tasks: any[]) {
    const allocations = tasks.map(task => {
      const assignedAgent = CapabilityNegotiator.negotiateOwnership(task.requiredCapability);
      return {
        ...task,
        assignedAgent,
        status: 'allocated'
      };
    });

    // Notify agents of their assignments
    for (const allocation of allocations) {
      await InterAgentCommunication.sendMessage('orchestrator', allocation.assignedAgent, {
        type: 'TASK_ASSIGNMENT',
        task: allocation
      });
    }

    return allocations;
  }
}
