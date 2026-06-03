export type WorkflowState = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'recovered';

export interface WorkflowContext {
  runId: string;
  userId: string;
  conversationId: string;
  variables: Record<string, any>;
  stepIndex: number;
}

/**
 * WorkflowStateMachine defines the transitions and logic for a durable workflow.
 * 
 * WHY A STATE MACHINE?
 * In complex autonomous systems, you cannot rely on linear code execution. 
 * A state machine ensures that every transition is valid, logged, and recoverable.
 * It provides a deterministic way to "replay" execution to reach the last known good state.
 */
export class WorkflowStateMachine {
  private currentState: WorkflowState = 'pending';
  private context: WorkflowContext;

  constructor(context: WorkflowContext) {
    this.context = context;
  }

  getState(): WorkflowState {
    return this.currentState;
  }

  getContext(): WorkflowContext {
    return this.context;
  }

  transitionTo(newState: WorkflowState) {
    const validTransitions: Record<WorkflowState, WorkflowState[]> = {
      'pending': ['running', 'failed', 'recovered'],
      'running': ['completed', 'failed', 'paused', 'recovered'],
      'paused': ['running', 'failed', 'recovered'],
      'recovered': ['running', 'failed'],
      'completed': [],
      'failed': ['recovered']
    };

    if (!validTransitions[this.currentState].includes(newState)) {
      throw new Error(`Invalid transition from ${this.currentState} to ${newState}`);
    }

    console.log(`Workflow ${this.context.runId}: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
  }

  updateVariables(newVars: Record<string, any>) {
    this.context.variables = { ...this.context.variables, ...newVars };
    this.context.stepIndex++;
  }
}
