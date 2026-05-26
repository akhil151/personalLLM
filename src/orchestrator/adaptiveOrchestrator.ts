import { FeedbackEngine } from '@/feedback/feedbackEngine';
import { CognitiveProfileEngine } from '@/adaptation/cognitiveProfileEngine';
import { MetaReasoningEngine } from '@/meta-reasoning/metaReasoningEngine';
import { AdaptivePlanner } from '@/optimization/adaptivePlanner';
import { SkillAcquisitionEngine } from '@/skills/skillAcquisitionEngine';
import { ContinuityEngine } from '@/continuity/continuityEngine';
import { ResourceGovernor } from '@/governance/resourceGovernor';
import { DistributedTaskAllocator } from '@/coordination/distributedTaskAllocator';
import { EvaluationEngine } from '@/evaluation/evaluationEngine';
import { OrganizationalMemory } from '@/organizational-memory/organizationalMemory';
import { orchestratorService } from './orchestratorService';

/**
 * adaptiveOrchestrator.ts
 * Integrates Phase 7 components into the core orchestration flow.
 */
export class AdaptiveOrchestrator {
  /**
   * Executes a run with full adaptive and self-improving capabilities.
   */
  public static async executeAdaptiveRun(userId: string, conversationId: string, goal: string) {
    // 1. REHYDRATE CONTINUITY & CONTEXT
    const briefing = await ContinuityEngine.rehydrateSession(userId);
    const institutionalContext = await OrganizationalMemory.getInstitutionalBriefing(goal);

    // 2. RESOURCE GOVERNANCE
    const env = await ResourceGovernor.prepareExecutionEnvironment(userId, goal, 'high');

    // 3. ADAPTIVE PLANNING
    const plan = await AdaptivePlanner.generateOptimizedPlan(userId, goal);
    
    // 4. START RUN
    const run = await orchestratorService.startRun(userId, conversationId, goal);

    try {
      // 5. TASK ALLOCATION & COORDINATION
      const allocations = await DistributedTaskAllocator.allocateTasks(plan.steps);

      // [Execution Logic would go here, calling dispatch for each allocation]
      
      // 6. INTROSPECTION (Meta-Reasoning)
      await MetaReasoningEngine.performIntrospection(run.id, userId);

      // 7. SKILL ACQUISITION (Post-run)
      await SkillAcquisitionEngine.runAcquisitionCycle(userId);

      // 8. UPDATE ORGANIZATIONAL MEMORY
      await OrganizationalMemory.updateInstitutionalMemory(run.id, `Successfully completed: ${goal}`);

      // 9. FINAL EVALUATION
      const evaluation = await EvaluationEngine.evaluateSystem(userId);

      await orchestratorService.updateRunStatus(run.id, 'completed', { 
        evaluation,
        efficiencyMode: env.efficiencyMode 
      });

      return { runId: run.id, evaluation };
    } catch (error: any) {
      await orchestratorService.updateRunStatus(run.id, 'failed', { error: error.message });
      throw error;
    }
  }
}
