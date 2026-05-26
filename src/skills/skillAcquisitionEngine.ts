import { OperationalPatternMiner } from './operationalPatternMiner';
import { WorkflowTemplateGenerator } from './workflowTemplateGenerator';
import { ReusableSkillRegistry } from './reusableSkillRegistry';

/**
 * skillAcquisitionEngine.ts
 * Orchestrates the discovery, abstraction, and registration of new skills.
 */
export class SkillAcquisitionEngine {
  /**
   * Periodically runs to discover and acquire new skills from user history.
   */
  public static async runAcquisitionCycle(userId: string) {
    // 1. Mine patterns
    const patterns = await OperationalPatternMiner.minePatterns(userId);
    
    // 2. Filter for high-confidence patterns
    const candidates = patterns.filter(p => p.confidence > 0.6);

    const acquired = [];
    for (const candidate of candidates) {
      // 3. Abstract and register
      // In a real system, this would involve an LLM to name and describe the skill
      const skill = await ReusableSkillRegistry.registerSkill({
        userId,
        name: `Automated Skill: ${candidate.sequence}`,
        description: `Automatically discovered pattern with confidence ${candidate.confidence}`,
        definition: { sequence: candidate.sequence }
      });
      acquired.push(skill);
    }

    return acquired;
  }
}
