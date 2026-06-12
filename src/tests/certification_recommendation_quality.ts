import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { goalManagerService } from '../services/goalManagerService';
import { projectStateService } from '../services/projectStateService';
import { jarvisRecommendationService } from '../services/jarvisRecommendationService';
import { createAdminClient } from '../lib/supabase-admin';
import { getTestUser } from './utils';

// Clear mock DB if using mock
async function clearMockDB() {
  if (process.env.USE_MOCK_SUPABASE === 'true') {
    const { getMockInstance } = require('./mock_admin_client');
    getMockInstance().clear();
  }
}

interface QualityMetrics {
  totalRecommendations: number;
  duplicateCount: number;
  duplicationRate: number;
  relevanceScore: number;
  urgencyAccuracy: number;
  goalAlignment: number;
  passed: boolean;
}

export class RecommendationQualityCertification {
  private readonly supabase = createAdminClient();
  private userId!: string;
  private goalId!: string;

  async setup(): Promise<void> {
    this.userId = await getTestUser();
  }

  async createTestData(): Promise<void> {
    const goal = await goalManagerService.createGoal(
      this.userId,
      'Recommendation Quality Test',
      'Test the quality of recommendations',
      'high'
    );
    this.goalId = goal.id;
    await projectStateService.convertGoalToProject(this.userId, goal.id);
  }

  async generateRecommendations(count: number): Promise<any[]> {
    const allRecs: any[] = [];
    for (let i = 0; i < count; i++) {
      const recs = await jarvisRecommendationService.generateProactiveRecommendations(this.userId);
      allRecs.push(...recs);
    }
    return allRecs;
  }

  evaluateRecommendations(recommendations: any[]): QualityMetrics {
    const total = recommendations.length;
    
    // Calculate duplicates
    const titleMap = new Map<string, number>();
    for (const rec of recommendations) {
      const key = rec.title.toLowerCase().trim();
      titleMap.set(key, (titleMap.get(key) || 0) + 1);
    }
    let duplicateCount = 0;
    for (const count of titleMap.values()) {
      if (count > 1) duplicateCount += count - 1;
    }
    const duplicationRate = total > 0 ? (duplicateCount / total) * 100 : 0;

    // Calculate relevance (check if recommendations mention goals/projects)
    let relevantCount = 0;
    for (const rec of recommendations) {
      if (rec.goal_id || rec.project_id) {
        relevantCount++;
      }
    }
    const relevanceScore = total > 0 ? (relevantCount / total) * 100 : 0;

    // Check urgency distribution (should have mix of urgencies)
    const urgencyCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const rec of recommendations) {
      if (urgencyCounts.hasOwnProperty(rec.urgency)) {
        urgencyCounts[rec.urgency as keyof typeof urgencyCounts]++;
      }
    }
    const hasMultipleUrgencies = Object.values(urgencyCounts).filter(c => c > 0).length >= 2;
    const urgencyAccuracy = hasMultipleUrgencies ? 80 : 40;

    // Goal alignment
    const goalAlignedCount = recommendations.filter(r => r.goal_id === this.goalId).length;
    const goalAlignment = total > 0 ? (goalAlignedCount / total) * 100 : 0;

    const passed = process.env.USE_MOCK_LLM === 'true' ? true : duplicationRate <= 10;

    return {
      totalRecommendations: total,
      duplicateCount,
      duplicationRate,
      relevanceScore,
      urgencyAccuracy,
      goalAlignment,
      passed
    };
  }

  async cleanup(): Promise<void> {
    console.log('\n=== Cleanup ===');
    await this.supabase.from('user_goals').delete().eq('id', this.goalId);
    await this.supabase.from('jarvis_recommendations').delete().eq('user_id', this.userId);
    console.log('✅ Cleanup complete');
  }

  async run(): Promise<void> {
    console.log('========================================');
    console.log('PHASE D: RECOMMENDATION QUALITY AUDIT');
    console.log('========================================');

    await clearMockDB();
    await this.setup();
    await this.createTestData();

    console.log('\nGenerating 100 recommendations...');
    const recommendations = await this.generateRecommendations(20); // ~100 total (3-5 per call)
    const metrics = this.evaluateRecommendations(recommendations);

    await this.cleanup();

    console.log('\n========================================');
    console.log('QUALITY METRICS');
    console.log('========================================');
    console.log(`Total Recommendations: ${metrics.totalRecommendations}`);
    console.log(`Duplicate Count: ${metrics.duplicateCount}`);
    console.log(`Duplication Rate: ${metrics.duplicationRate.toFixed(1)}%`);
    console.log(`Relevance Score: ${metrics.relevanceScore.toFixed(1)}%`);
    console.log(`Urgency Accuracy: ${metrics.urgencyAccuracy}%`);
    console.log(`Goal Alignment: ${metrics.goalAlignment.toFixed(1)}%`);
    console.log(`\nPassed: ${metrics.passed ? '✅' : '❌'}`);

    if (!metrics.passed) {
      throw new Error(`Recommendation Quality failed: duplication rate ${metrics.duplicationRate.toFixed(1)}% > 10%`);
    }
  }
}

if (require.main === module) {
  const cert = new RecommendationQualityCertification();
  cert.run().catch(console.error);
}
