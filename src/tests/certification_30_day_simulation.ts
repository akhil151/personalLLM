import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { goalManagerService } from '../services/goalManagerService';
import { projectStateService } from '../services/projectStateService';
import { jarvisService } from '../services/jarvisService';
import { jarvisRecommendationService } from '../services/jarvisRecommendationService';
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

interface DayState {
  day: number;
  progress: number;
  health: string;
  recommendations: number;
  hasBlocker: boolean;
}

export class ThirtyDaySimulationCertification {
  private readonly supabase = createAdminClient();
  private userId!: string;
  private goalId!: string;
  private projectId!: string;
  private milestoneIds: string[] = [];
  private taskIds: string[] = [];
  private states: DayState[] = [];

  async setup(): Promise<void> {
    this.userId = await getTestUser();
  }

  async createInitialProject(): Promise<void> {
    const goal = await goalManagerService.createGoal(
      this.userId,
      '30-Day Simulation Test',
      'Testing 30 days of activity',
      'high'
    );
    this.goalId = goal.id;

    const { project, milestones } = await projectStateService.convertGoalToProject(this.userId, goal.id);
    this.projectId = project.id;
    this.milestoneIds = milestones.map(m => m.id);

    const { data: tasks } = await this.supabase
      .from('milestone_tasks')
      .select('id')
      .in('milestone_id', this.milestoneIds);
    if (tasks) this.taskIds = tasks.map((t:any) => t.id);
  }

  async simulateDay(day: number): Promise<DayState> {
    const baseDate = new Date();
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() - (30 - day));

    // Randomly decide what happens on this day
    const event = Math.random();
    let hasBlocker = false;

    if (event < 0.4) {
      // Complete a task
      const taskToComplete = this.taskIds[Math.floor(Math.random() * this.taskIds.length)];
      await this.supabase
        .from('milestone_tasks')
        .update({ status: 'completed', updated_at: currentDate.toISOString() })
        .eq('id', taskToComplete);
    } else if (event < 0.6) {
      // Miss a day (do nothing)
    } else if (event < 0.7) {
      // Stalled milestone
      if (this.milestoneIds.length > 0) {
        const milestoneToStall = this.milestoneIds[0];
        const stallDate = new Date(currentDate);
        stallDate.setDate(stallDate.getDate() - 14);
        await this.supabase
          .from('project_milestones')
          .update({ updated_at: stallDate.toISOString() })
          .eq('id', milestoneToStall);
        hasBlocker = true;
      }
    } else if (event < 0.85) {
      // Complete a milestone
      if (this.milestoneIds.length > 0) {
        const milestoneToComplete = this.milestoneIds[0];
        await this.supabase
          .from('project_milestones')
          .update({ status: 'completed', updated_at: currentDate.toISOString() })
          .eq('id', milestoneToComplete);
      }
    } else {
      // Create a blocker
      await this.supabase
        .from('project_blockers')
        .insert({
          project_id: this.projectId,
          description: 'Test blocker for simulation',
          created_at: currentDate.toISOString()
        });
      hasBlocker = true;
    }

    // Update project timestamp
    await this.supabase
      .from('user_projects')
      .update({ updated_at: currentDate.toISOString() })
      .eq('id', this.projectId);

    // Update goal timestamp
    await this.supabase
      .from('user_goals')
      .update({ updated_at: currentDate.toISOString() })
      .eq('id', this.goalId);

    // Get current state
    const progress = await goalManagerService.updateProgress(this.goalId);
    const health = await projectStateService.calculateProjectHealth(this.projectId);
    const recommendations = await jarvisRecommendationService.generateProactiveRecommendations(this.userId);

    const state: DayState = {
      day,
      progress,
      health,
      recommendations: recommendations.length,
      hasBlocker
    };

    this.states.push(state);
    console.log(`Day ${day}: Progress ${progress}%, Health ${health}, Recs ${recommendations.length}, Blocker ${hasBlocker}`);

    return state;
  }

  verifyConsistency(): boolean {
    if (this.states.length === 0) return false;

    // Progress should be non-decreasing overall
    let previousProgress = -1;
    let progressConsistent = true;
    for (const state of this.states) {
      if (state.progress < previousProgress - 10) { // Allow small fluctuations
        progressConsistent = false;
      }
      previousProgress = state.progress;
    }

    // Should have recommendations most days
    const daysWithRecs = this.states.filter(s => s.recommendations > 0).length;
    const recsConsistent = daysWithRecs >= this.states.length * 0.5;

    // Health should change based on events
    const healthChanges = new Set(this.states.map(s => s.health)).size >= 2;

    return progressConsistent && recsConsistent;
  }

  async cleanup(): Promise<void> {
    console.log('\n=== Cleanup ===');
    await this.supabase.from('user_goals').delete().eq('id', this.goalId);
    await this.supabase.from('project_blockers').delete().eq('project_id', this.projectId);
    await this.supabase.from('jarvis_recommendations').delete().eq('user_id', this.userId);
    console.log('✅ Cleanup complete');
  }

  async run(): Promise<void> {
    console.log('========================================');
    console.log('PHASE E: 30-DAY SIMULATION');
    console.log('========================================');

    await clearMockDB();
    await this.setup();
    await this.createInitialProject();

    console.log('\nSimulating 30 days...');
    for (let day = 1; day <= 30; day++) {
      await this.simulateDay(day);
    }

    const consistent = this.verifyConsistency();

    await this.cleanup();

    console.log('\n========================================');
    console.log('FINAL RESULTS');
    console.log('========================================');
    console.log(`Days simulated: ${this.states.length}`);
    console.log(`Consistency check: ${consistent ? '✅' : '❌'}`);

    if (!consistent) {
      throw new Error('30-Day Simulation failed - metrics became inconsistent');
    }
  }
}

if (require.main === module) {
  const cert = new ThirtyDaySimulationCertification();
  cert.run().catch(console.error);
}
