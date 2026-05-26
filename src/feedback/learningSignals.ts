/**
 * learningSignals.ts
 * Defines the types of behavioral and environmental signals used for reinforcement learning.
 */

export enum SignalType {
  USER_APPROVAL = 'user_approval',
  USER_REJECTION = 'user_rejection',
  USER_CORRECTION = 'user_correction',
  EXECUTION_SUCCESS = 'execution_success',
  EXECUTION_FAILURE = 'execution_failure',
  EXECUTION_RETRY = 'execution_retry',
  LATENCY_ANOMALY = 'latency_anomaly',
  TOKEN_EFFICIENCY = 'token_efficiency'
}

export interface LearningSignal {
  type: SignalType;
  value: any;
  context: {
    runId?: string;
    agentName?: string;
    taskId?: string;
    stepId?: string;
    timestamp: number;
  };
  metadata?: Record<string, any>;
}

export const signalWeights: Record<SignalType, number> = {
  [SignalType.USER_APPROVAL]: 1.0,
  [SignalType.USER_REJECTION]: -1.0,
  [SignalType.USER_CORRECTION]: -0.5,
  [SignalType.EXECUTION_SUCCESS]: 0.8,
  [SignalType.EXECUTION_FAILURE]: -0.8,
  [SignalType.EXECUTION_RETRY]: -0.2,
  [SignalType.LATENCY_ANOMALY]: -0.1,
  [SignalType.TOKEN_EFFICIENCY]: 0.1,
};
