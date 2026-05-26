import { eventBus, WorkflowEvent } from './eventBus';
import { orchestratorService } from '@/orchestrator/orchestratorService';

/**
 * EventDispatcher coordinates the flow of events across the system.
 * It acts as the "wiring" between decoupled services.
 */
export const eventDispatcher = {
  init() {
    console.log('Initializing Event Dispatcher...');

    // When a plan is generated, trigger the first task
    eventBus.subscribe('PLAN_GENERATED', async (event: WorkflowEvent) => {
      const { tasks } = event.payload;
      if (tasks && tasks.length > 0) {
        await eventBus.publish(event.runId, 'TASK_CREATED', { task: tasks[0], index: 0 });
      }
    });

    // When a task is created, dispatch to the correct agent via the orchestrator
    eventBus.subscribe('TASK_CREATED', async (event: WorkflowEvent) => {
      const { task } = event.payload;
      console.log(`Dispatcher: Routing task "${task.title}" to ${task.assigned_agent}`);
      
      // The orchestrator still handles agent logic, but now it's triggered by events
      const result = await orchestratorService.dispatch(task.assigned_agent, {
        runId: event.runId,
        conversationId: '', // Would be retrieved from run context
        userId: '',
        data: { task }
      });

      if (result.success) {
        await eventBus.publish(event.runId, 'TOOL_EXECUTED', { result: result.data });
      } else {
        await eventBus.publish(event.runId, 'JOB_FAILED', { error: result.error });
      }
    });

    // Handle workflow completion
    eventBus.subscribe('WORKFLOW_COMPLETED', async (event: WorkflowEvent) => {
      console.log(`Workflow ${event.runId} finished successfully.`);
    });
  }
};
