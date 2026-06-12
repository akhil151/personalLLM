import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { goalManagerService } from '../services/goalManagerService';
import { projectStateService } from '../services/projectStateService';
import { jarvisService } from '../services/jarvisService';
import { jarvisRecommendationService } from '../services/jarvisRecommendationService';
import { blockerDetectionService } from '../services/blockerDetectionService';
import { createAdminClient } from '../lib/supabase-admin';
import { getTestUser } from './utils';

// Clear mock DB if using mock
async function clearMockDB() {
  if (process.env.USE_MOCK_SUPABASE === 'true') {
    const { getMockInstance } = require('./mock_admin_client');
    getMockInstance().clear();
  }
}

interface PerformanceMetrics {
  dashboardLoad: { avg: number; max: number; p95: number };
  recommendations: { avg: number; max: number; p95: number };
  executiveBrief: { avg: number; max: number; p95: number };
  blockerScan: { avg: number; max: number; p95: number };
}

export class ScaleCertification {
  private readonly supabase = createAdminClient();
  private userId!: string;
  private goalIds: string[] = [];
  private projectIds: string[] = [];

  async setup(): Promise<void> {
    this.userId = await getTestUser();
  }

  async generateLargeScaleData(): Promise<void> {
    console.log('\nGenerating large scale data...');
    console.log('Creating 100 goals, 500 projects, 5000 tasks...');

    // Create 100 goals
    for (let i = 0; i < 100; i++) {
      const goal = await goalManagerService.createGoal(
        this.userId,
        `Scale Test Goal ${i + 1}`,
        `Description for scale test goal ${i + 1}`,
        i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low'
      );
      this.goalIds.push(goal.id);

      // Each goal gets 5 projects (total 500)
      for (let j = 0; j < 5; j++) {
        const { project, milestones } = await projectStateService.convertGoalToProject(this.userId, goal.id);
        this.projectIds.push(project.id);
      }
    }

    console.log('✅ Scale data generated');
  }

  async measurePerformance(): Promise<PerformanceMetrics> {
    console.log('\nMeasuring performance...');

    const dashboardTimes: number[] = [];
    const recommendationTimes: number[] = [];
    const briefTimes: number[] = [];
    const blockerTimes: number[] = [];

    // Run each operation 10 times
    for (let i = 0; i < 10; i++) {
      // Dashboard load (get goals + projects)
      const start1 = performance.now();
      await Promise.all([
        goalManagerService.getActiveGoals(this.userId),
        projectStateService.getActiveProjects(this.userId)
      ]);
      const end1 = performance.now();
      dashboardTimes.push(end1 - start1);

      // Recommendations
      const start2 = performance.now();
      await jarvisRecommendationService.generateProactiveRecommendations(this.userId);
      const end2 = performance.now();
      recommendationTimes.push(end2 - start2);

      // Executive brief
      const start3 = performance.now();
      await jarvisService.generateExecutiveBrief(this.userId);
      const end3 = performance.now();
      briefTimes.push(end3 - start3);

      // Blocker scan
      const start4 = performance.now();
      await blockerDetectionService.detectBlockers(this.userId);
      const end4 = performance.now();
      blockerTimes.push(end4 - start4);
    }

    const calculateStats = (times: number[]) => {
      const sorted = [...times].sort((a, b) => a - b);
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const max = sorted[sorted.length - 1];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      return { avg: Math.round(avg), max: Math.round(max), p95: Math.round(p95) };
    };

    return {
      dashboardLoad: calculateStats(dashboardTimes),
      recommendations: calculateStats(recommendationTimes),
      executiveBrief: calculateStats(briefTimes),
      blockerScan: calculateStats(blockerTimes)
    };
  }

  async cleanup(): Promise<void> {
    console.log('\n=== Cleanup ===');
    for (const goalId of this.goalIds) {
      await this.supabase.from('user_goals').delete().eq('id', goalId);
    }
    await this.supabase.from('jarvis_recommendations').delete().eq('user_id', this.userId);
    console.log('✅ Cleanup complete');
  }

  async run(): Promise<void> {
    console.log('========================================');
    console.log('PHASE G: PRODUCTION SCALE TEST');
    console.log('========================================');

    await clearMockDB();
    await this.setup();
    await this.generateLargeScaleData();
    const metrics = await this.measurePerformance();
    await this.cleanup();

    console.log('\n========================================');
    console.log('PERFORMANCE METRICS');
    console.log('========================================');
    console.log('Dashboard Load:');
    console.log(`  Avg: ${metrics.dashboardLoad.avg}ms`);
    console.log(`  Max: ${metrics.dashboardLoad.max}ms`);
    console.log(`  P95: ${metrics.dashboardLoad.p95}ms`);
    console.log('\nRecommendations:');
    console.log(`  Avg: ${metrics.recommendations.avg}ms`);
    console.log(`  Max: ${metrics.recommendations.max}ms`);
    console.log(`  P95: ${metrics.recommendations.p95}ms`);
    console.log('\nExecutive Brief:');
    console.log(`  Avg: ${metrics.executiveBrief.avg}ms`);
    console.log(`  Max: ${metrics.executiveBrief.max}ms`);
    console.log(`  P95: ${metrics.executiveBrief.p95}ms`);
    console.log('\nBlocker Scan:');
    console.log(`  Avg: ${metrics.blockerScan.avg}ms`);
    console.log(`  Max: ${metrics.blockerScan.max}ms`);
    console.log(`  P95: ${metrics.blockerScan.p95}ms`);

    // Check if all p95 times are acceptable (under 5 seconds)
    const allAcceptable = 
      metrics.dashboardLoad.p95 < 5000 &&
      metrics.recommendations.p95 < 5000 &&
      metrics.executiveBrief.p95 < 5000 &&
      metrics.blockerScan.p95 < 5000;

    console.log(`\nAll operations within acceptable limits: ${allAcceptable ? '✅' : '❌'}`);

    if (!allAcceptable) {
      throw new Error('Scale Test failed - operations too slow');
    }
  }
}

if (require.main === module) {
  const cert = new ScaleCertification();
  cert.run().catch(console.error);
}
