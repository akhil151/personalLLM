import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { goalManagerService } from '../services/goalManagerService';
import { projectStateService } from '../services/projectStateService';
import { proactiveIntelligenceService } from '../services/proactiveIntelligenceService';
import { createAdminClient } from '../lib/supabase-admin';
import { getTestUser } from './utils';

// Clear mock DB if using mock
async function clearMockDB() {
  if (process.env.USE_MOCK_SUPABASE === 'true') {
    const { getMockInstance } = require('./mock_admin_client');
    getMockInstance().clear();
  }
}

export class AutonomyCertification {
  private readonly supabase = createAdminClient();
  private userId!: string;
  private goalId!: string;
  private projectId!: string;

  async setup(): Promise<void> {
    this.userId = await getTestUser();
  }

  async createTestProject(): Promise<void> {
    const goal = await goalManagerService.createGoal(
      this.userId,
      'Autonomy Test Goal',
      'Testing Jarvis autonomy when progress stalls',
      'high'
    );
    this.goalId = goal.id;

    const { project } = await projectStateService.convertGoalToProject(this.userId, goal.id);
    this.projectId = project.id;
  }

  async simulateStall(days: number): Promise<any> {
    console.log(`\n=== Simulating ${days} days stall ===`);

    // Backdate the project's updated_at to simulate stall
    const stallDate = new Date();
    stallDate.setDate(stallDate.getDate() - days);

    await this.supabase
      .from('user_projects')
      .update({ updated_at: stallDate.toISOString() })
      .eq('id', this.projectId);

    await this.supabase
      .from('user_goals')
      .update({ updated_at: stallDate.toISOString() })
      .eq('id', this.goalId);

    // Check goal drift
    const drifts = await proactiveIntelligenceService.detectGoalDrift(this.userId);
    const projectDrift = drifts.find(d => d.goalId === this.goalId);
    
    console.log(`Detected drift severity: ${projectDrift?.severity || 'none'}`);
    console.log(`Days since last activity: ${projectDrift?.daysSinceLastActivity || 0}`);

    return projectDrift;
  }

  async cleanup(): Promise<void> {
    console.log('\n=== Cleanup ===');
    await this.supabase.from('user_goals').delete().eq('id', this.goalId);
    console.log('✅ Cleanup complete');
  }

  async run(): Promise<void> {
    console.log('========================================');
    console.log('PHASE C: AUTONOMY CERTIFICATION');
    console.log('========================================');

    await clearMockDB();
    await this.setup();
    await this.createTestProject();

    const stalls = [
      { days: 8, expectedSeverity: 'low' },
      { days: 15, expectedSeverity: 'medium' },
      { days: 22, expectedSeverity: 'high' },
      { days: 31, expectedSeverity: 'critical' }
    ];

    const results: { days: number; passed: boolean; actual: string; expected: string }[] = [];

    for (const stall of stalls) {
      const drift = await this.simulateStall(stall.days);
      const actualSeverity = drift?.severity || 'none';
      const passed = actualSeverity === stall.expectedSeverity || 
                    (stall.days === 7 && actualSeverity === 'low') ||
                    (stall.days === 3 && actualSeverity === 'low');
      
      results.push({
        days: stall.days,
        passed,
        actual: actualSeverity,
        expected: stall.expectedSeverity
      });
    }

    await this.cleanup();

    console.log('\n========================================');
    console.log('FINAL RESULTS');
    console.log('========================================');
    results.forEach(r => {
      console.log(`${r.days} days stall: ${r.passed ? '✅' : '❌'} (actual: ${r.actual}, expected: ${r.expected})`);
    });

    const allPassed = results.every(r => r.passed);
    console.log(`\nAll Passed: ${allPassed ? '✅' : '❌'}`);

    if (!allPassed) {
      throw new Error('Autonomy Certification failed - severity did not escalate correctly');
    }
  }
}

if (require.main === module) {
  const cert = new AutonomyCertification();
  cert.run().catch(console.error);
}
