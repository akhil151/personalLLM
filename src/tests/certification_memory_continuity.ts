import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { goalManagerService } from '../services/goalManagerService';
import { projectStateService } from '../services/projectStateService';
import { jarvisRecommendationService } from '../services/jarvisRecommendationService';
import { priorityEngine } from '../services/priorityEngine';
import { createAdminClient } from '../lib/supabase-admin';
import { getTestUser } from './utils';

// Clear mock DB if using mock
async function clearMockDB() {
  if (process.env.USE_MOCK_SUPABASE === 'true') {
    const { getMockInstance } = require('./mock_admin_client');
    getMockInstance().clear();
  }
}

export class MemoryContinuityCertification {
  private readonly supabase = createAdminClient();
  private userId!: string;
  private goalId!: string;
  private projectId!: string;
  private milestoneIds: string[] = [];
  private taskIds: string[] = [];

  async setup(): Promise<void> {
    this.userId = await getTestUser();
  }

  async simulateDay1(): Promise<void> {
    console.log('\n=== DAY 1: Create goal and project ===');
    const goal = await goalManagerService.createGoal(
      this.userId,
      'Memory Continuity Test Goal',
      'Testing that Jarvis remembers everything correctly over time',
      'high'
    );
    this.goalId = goal.id;
    console.log('✅ Goal created');

    const { project, milestones } = await projectStateService.convertGoalToProject(this.userId, goal.id);
    this.projectId = project.id;
    this.milestoneIds = milestones.map(m => m.id);
    console.log('✅ Project and milestones created');

    // Get tasks
    const { data: tasks } = await this.supabase
      .from('milestone_tasks')
      .select('id')
      .in('milestone_id', this.milestoneIds);
    if (tasks) this.taskIds = tasks.map((t: any) => t.id);
    console.log('✅ Tasks retrieved');
  }

  async simulateDay2(): Promise<boolean> {
    console.log('\n=== DAY 2: Ask for next action ===');
    
    // Check if goal is still there
    const goal = await goalManagerService.getActiveGoal(this.userId);
    if (!goal || goal.id !== this.goalId) {
      console.error('❌ Goal not found or mismatch');
      return false;
    }
    console.log('✅ Goal remembered');

    // Check if project is still there
    const project = await projectStateService.getActiveProject(this.userId);
    if (!project || project.id !== this.projectId) {
      console.error('❌ Project not found or mismatch');
      return false;
    }
    console.log('✅ Project remembered');

    // Get next action
    const nextAction = await priorityEngine.determineNextAction(this.userId);
    console.log(`✅ Next action: ${nextAction.nextAction}`);

    return true;
  }

  async simulateDay7(): Promise<boolean> {
    console.log('\n=== DAY 7: Resume project ===');

    // Check goals
    const goals = await goalManagerService.getActiveGoals(this.userId);
    const hasGoal = goals.some((g: any) => g.id === this.goalId);
    if (!hasGoal) {
      console.error('❌ Goal missing');
      return false;
    }
    console.log('✅ Goals intact');

    // Check projects
    const projects = await projectStateService.getActiveProjects(this.userId);
    const hasProject = projects.some((p: any) => p.id === this.projectId);
    if (!hasProject) {
      console.error('❌ Project missing');
      return false;
    }
    console.log('✅ Projects intact');

    // Get recommendations
    const recs = await jarvisRecommendationService.generateProactiveRecommendations(this.userId);
    console.log(`✅ ${recs.length} recommendations generated (remembering context)`);

    return true;
  }

  async simulateDay14(): Promise<boolean> {
    console.log('\n=== DAY 14: Request progress ===');

    // Check all milestones exist
    const { data: milestones } = await this.supabase
      .from('project_milestones')
      .select('id')
      .in('id', this.milestoneIds);
    if (!milestones || milestones.length !== this.milestoneIds.length) {
      console.error('❌ Milestones missing');
      return false;
    }
    console.log('✅ All milestones remembered');

    // Check all tasks exist
    const { data: tasks } = await this.supabase
      .from('milestone_tasks')
      .select('id')
      .in('id', this.taskIds);
    if (!tasks || tasks.length !== this.taskIds.length) {
      console.error('❌ Tasks missing');
      return false;
    }
    console.log('✅ All tasks remembered');

    return true;
  }

  async cleanup(): Promise<void> {
    console.log('\n=== Cleanup ===');
    await this.supabase.from('user_goals').delete().eq('id', this.goalId);
    console.log('✅ Cleanup complete');
  }

  async run(): Promise<void> {
    console.log('========================================');
    console.log('PHASE B: MEMORY CONTINUITY CERTIFICATION');
    console.log('========================================');

    await clearMockDB();
    await this.setup();

    await this.simulateDay1();
    const day2Passed = await this.simulateDay2();
    const day7Passed = await this.simulateDay7();
    const day14Passed = await this.simulateDay14();

    await this.cleanup();

    const allPassed = day2Passed && day7Passed && day14Passed;

    console.log('\n========================================');
    console.log('FINAL RESULTS');
    console.log('========================================');
    console.log(`Day 2: ${day2Passed ? '✅' : '❌'}`);
    console.log(`Day 7: ${day7Passed ? '✅' : '❌'}`);
    console.log(`Day 14: ${day14Passed ? '✅' : '❌'}`);
    console.log(`All Passed: ${allPassed ? '✅' : '❌'}`);

    if (!allPassed) {
      throw new Error('Memory Continuity Certification failed');
    }
  }
}

if (require.main === module) {
  const cert = new MemoryContinuityCertification();
  cert.run().catch(console.error);
}
