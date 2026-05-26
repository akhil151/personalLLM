import { UserModelService } from './userModelService';
import { PreferenceLearner } from './preferenceLearner';
import { BehavioralProfiler } from './behavioralProfiler';

/**
 * cognitiveProfileEngine.ts
 * Synthesizes holistic user models from various behavioral and preference signals.
 */
export class CognitiveProfileEngine {
  /**
   * Performs a comprehensive update of the user's cognitive profile.
   */
  public static async synthesizeProfile(userId: string) {
    // 1. Fetch all raw data components
    const profile = await UserModelService.getProfile(userId);
    const activePatterns = await BehavioralProfiler.getActivePatterns(userId);
    
    // 2. Perform synthesis (This would typically involve an LLM reasoning step)
    // We analyze the patterns to infer broader cognitive traits.
    
    const cognitiveStyle = this.inferCognitiveStyle(activePatterns);
    const expertiseAreas = this.extractExpertise(activePatterns);

    // 3. Update the persistent profile
    await UserModelService.updateProfile(userId, {
      cognitive_style: cognitiveStyle,
      expertise_areas: expertiseAreas,
      productivity_patterns: {
        activePatternsCount: activePatterns.length,
        lastSynthesized: new Date().toISOString()
      }
    });

    return { cognitiveStyle, expertiseAreas };
  }

  /**
   * Heuristic or AI-driven inference of cognitive style.
   */
  private static inferCognitiveStyle(patterns: any[]): string {
    const types = patterns.map(p => p.pattern_type);
    if (types.filter(t => t === 'systematic').length > 3) return 'Systematic / Analytical';
    if (types.filter(t => t === 'exploratory').length > 3) return 'Intuitive / Exploratory';
    return 'Balanced / Adaptive';
  }

  /**
   * Extracts areas of expertise from behavior patterns.
   */
  private static extractExpertise(patterns: any[]): string[] {
    // Logic to extract keywords from pattern descriptions
    const expertise = new Set<string>();
    patterns.forEach(p => {
      if (p.description.toLowerCase().includes('code')) expertise.add('Software Engineering');
      if (p.description.toLowerCase().includes('data')) expertise.add('Data Science');
      if (p.description.toLowerCase().includes('market')) expertise.add('Business Intelligence');
    });
    return Array.from(expertise);
  }
}
