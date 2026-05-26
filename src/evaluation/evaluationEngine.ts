import { CapabilityScorer } from './capabilityScorer';
import { BenchmarkRunner } from './benchmarkRunner';
import { RegressionDetector } from './regressionDetector';

/**
 * evaluationEngine.ts
 * The high-level orchestrator for autonomous system evaluation.
 */
export class EvaluationEngine {
  /**
   * Performs a complete system evaluation.
   */
  public static async evaluateSystem(userId: string) {
    // 1. Score all major capabilities
    const capabilities = ['planner', 'executor', 'browser', 'memory'];
    const capabilityScores: Record<string, number> = {};
    for (const cap of capabilities) {
      capabilityScores[cap] = await CapabilityScorer.scoreCapability(userId, cap);
    }

    // 2. Run benchmarks
    const benchmarkResults = await BenchmarkRunner.runAllBenchmarks();

    // 3. Check for regressions (requires fetching historical baseline)
    const baselineResults = benchmarkResults.map(r => ({ ...r, score: r.score + 0.05 })); // Mock baseline
    const regressions = RegressionDetector.detectRegressions(benchmarkResults, baselineResults);

    return {
      capabilityScores,
      benchmarkResults,
      regressions,
      overallHealth: regressions.length === 0 ? 'healthy' : 'degraded'
    };
  }
}
