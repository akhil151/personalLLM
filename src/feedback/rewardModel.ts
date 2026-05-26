import { SignalType, LearningSignal, signalWeights } from './learningSignals';

/**
 * rewardModel.ts
 * Translates learning signals into normalized reward scores.
 */
export class RewardModel {
  /**
   * Calculates a total reward score based on multiple signals.
   */
  public static calculateReward(signals: LearningSignal[]): number {
    let totalReward = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const weight = signalWeights[signal.type];
      const normalizedValue = this.normalizeSignalValue(signal);
      
      totalReward += normalizedValue * weight;
      totalWeight += Math.abs(weight);
    }

    // Return normalized average reward between -1 and 1
    return totalWeight > 0 ? totalReward / totalWeight : 0;
  }

  /**
   * Normalizes signal values based on their type.
   */
  private static normalizeSignalValue(signal: LearningSignal): number {
    switch (signal.type) {
      case SignalType.USER_APPROVAL:
      case SignalType.EXECUTION_SUCCESS:
        return 1.0;
      case SignalType.USER_REJECTION:
      case SignalType.EXECUTION_FAILURE:
        return 1.0; // The negative weight in signalWeights will handle the sign
      case SignalType.USER_CORRECTION:
        return 0.5; // Moderate correction
      default:
        return typeof signal.value === 'number' ? Math.min(Math.max(signal.value, 0), 1) : 1.0;
    }
  }

  /**
   * Analyzes the context of a reward to provide qualitative feedback.
   */
  public static getFeedbackInsight(reward: number): string {
    if (reward > 0.8) return 'Highly effective strategy, reinforce patterns.';
    if (reward > 0.4) return 'Positive outcome, continue with minor optimizations.';
    if (reward < -0.8) return 'Critical failure or rejection, avoid this path entirely.';
    if (reward < -0.4) return 'Ineffective strategy, significant adaptation required.';
    return 'Neutral or mixed results, monitor for patterns.';
  }
}
