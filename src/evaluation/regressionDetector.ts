/**
 * regressionDetector.ts
 * Detects performance drops compared to historical baselines.
 */
export class RegressionDetector {
  /**
   * Analyzes benchmark results for potential regressions.
   */
  public static detectRegressions(newResults: any[], baselineResults: any[]) {
    const regressions = [];

    for (const result of newResults) {
      const baseline = baselineResults.find(b => b.benchmarkId === result.benchmarkId);
      if (baseline) {
        const drop = baseline.score - result.score;
        if (drop > 0.1) { // 10% drop threshold
          regressions.push({
            benchmarkId: result.benchmarkId,
            name: result.name,
            drop,
            severity: drop > 0.3 ? 'critical' : 'warning'
          });
        }
      }
    }

    return regressions;
  }
}
