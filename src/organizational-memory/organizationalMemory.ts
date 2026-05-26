import { OperationalHistoryEngine } from './operationalHistoryEngine';
import { InstitutionalKnowledgeBase } from './institutionalKnowledgeBase';

/**
 * organizationalMemory.ts
 * The high-level orchestrator for collective operational intelligence.
 */
export class OrganizationalMemory {
  /**
   * Updates the organizational memory based on a completed project or major run.
   */
  public static async updateInstitutionalMemory(runId: string, summary: string) {
    // 1. Record the event
    await OperationalHistoryEngine.recordInstitutionalEvent({
      type: 'success',
      context: 'project_completion',
      description: summary,
      outcome: { runId }
    });

    // 2. Extract potential playbooks (In a real system, this involves LLM analysis)
    // If this run was highly successful, we might register its steps as a playbook
  }

  /**
   * Retrieves the "Institutional Briefing" for a new project.
   */
  public static async getInstitutionalBriefing(context: string) {
    const playbook = await InstitutionalKnowledgeBase.findPlaybook(context);
    const history = await OperationalHistoryEngine.getHistoricalInsights(context);

    return {
      recommendedPlaybook: playbook,
      historicalContext: history?.slice(0, 3).map(h => h.reasoning),
      advice: playbook ? `Follow the ${playbook.name} playbook for best results.` : 'No specific institutional record found for this context.'
    };
  }
}
