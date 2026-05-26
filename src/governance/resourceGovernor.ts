import { ModelRouter } from './modelRouter';
import { AdaptiveBudgetEngine } from './adaptiveBudgetEngine';
import { ContextOptimizer } from './contextOptimizer';

/**
 * resourceGovernor.ts
 * The high-level controller for intelligent infrastructure optimization.
 */
export class ResourceGovernor {
  /**
   * Prepares the execution environment for a task based on resource availability.
   */
  public static async prepareExecutionEnvironment(userId: string, task: string, priority: 'high' | 'medium' | 'low') {
    // 1. Route to optimal model
    const model = ModelRouter.routeTask(task);
    
    // 2. Check and allocate budget
    const estimatedTokens = AdaptiveBudgetEngine.allocateBudget(priority);
    const budgetCheck = await AdaptiveBudgetEngine.checkBudget(userId, estimatedTokens);

    if (!budgetCheck.allowed) {
      // Logic to fallback to cheaper model or alert user
      console.warn('Budget exceeded, falling back to emergency efficiency mode');
    }

    // 3. Determine context strategy
    const retrievalDepth = ContextOptimizer.determineRetrievalDepth(priority === 'high' ? 0.9 : 0.5);

    return {
      model,
      tokenLimit: estimatedTokens,
      retrievalDepth,
      efficiencyMode: !budgetCheck.allowed
    };
  }
}
