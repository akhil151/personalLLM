import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { goalManagerService } from '../services/goalManagerService';
import { projectStateService } from '../services/projectStateService';
import { jarvisService } from '../services/jarvisService';
import { priorityEngine } from '../services/priorityEngine';
import { blockerDetectionService } from '../services/blockerDetectionService';
import { jarvisRecommendationService } from '../services/jarvisRecommendationService';
import { createAdminClient } from '../lib/supabase-admin';
import './utils'; // For side effects if any

const TEST_USER_ID = '734a3720-5908-429d-bef9-89c66c5adc17';

async function runExecutiveDashboardCertification() {
  console.log('PHASE Z.4.5 — EXECUTIVE DASHBOARD CERTIFICATION');
  console.log('====================================================\n');

  const supabase = createAdminClient();
  let goalId: string;
  let projectId: string;

  try {
    // 1. Create Test Goal
    console.log('[1/8] Creating test goal...');
    const goal = await goalManagerService.createGoal(
      TEST_USER_ID,
      'Launch Product MVP',
      'Build and launch minimum viable product by end of quarter.',
      'high'
    );
    goalId = goal.id;
    console.log(`  ✅ Test goal created: ${goal.title}`);

    // 2. Convert Goal to Project
    console.log('\n[2/8] Converting goal to project...');
    const { project, milestones } = await projectStateService.convertGoalToProject(TEST_USER_ID, goalId);
    projectId = project.id;
    console.log(`  ✅ Project created: ${project.title}`);
    console.log(`  ✅ Milestones: ${milestones.length}`);

    // 3. Generate Executive Brief
    console.log('\n[3/8] Testing Executive Brief Generation...');
    const brief = await jarvisService.generateExecutiveBrief(TEST_USER_ID);
    console.log('  ✅ Executive Brief generated:');
    console.log(`     - Goal Summary: ${brief.goal_summary}`);
    console.log(`     - Progress: ${brief.progress_percentage}%`);
    console.log(`     - Next Action: ${brief.next_recommended_action}`);

    // 4. Test Priority Engine
    console.log('\n[4/8] Testing Priority Engine...');
    const nextAction = await priorityEngine.determineNextAction(TEST_USER_ID);
    console.log('  ✅ Priority Engine result:');
    console.log(`     - Next Action: ${nextAction.nextAction}`);
    console.log(`     - Impact: ${nextAction.impact}`);

    // 5. Test Blocker Detection
    console.log('\n[5/8] Testing Blocker Detection...');
    const blockers = await blockerDetectionService.detectBlockers(TEST_USER_ID);
    console.log(`  ✅ Blocker Detection: ${blockers.length} blockers found`);

    // 6. Test Recommendations
    console.log('\n[6/8] Testing Recommendations...');
    await jarvisRecommendationService.generateProactiveRecommendations(TEST_USER_ID);
    const recommendations = await jarvisRecommendationService.getLatestRecommendations(TEST_USER_ID);
    console.log(`  ✅ Recommendations: ${recommendations.length} available`);

    // 7. Test Goals Dashboard
    console.log('\n[7/8] Testing Goals Dashboard Data...');
    const goals = await goalManagerService.getActiveGoals(TEST_USER_ID);
    const activeGoal = await goalManagerService.getActiveGoal(TEST_USER_ID);
    console.log(`  ✅ Active goals: ${goals.length}`);
    console.log(`  ✅ Highest priority goal: ${activeGoal?.title}`);

    // 8. Test Projects Dashboard
    console.log('\n[8/8] Testing Projects Dashboard Data...');
    const projects = await projectStateService.getActiveProjects(TEST_USER_ID);
    const activeProject = await projectStateService.getActiveProject(TEST_USER_ID);
    console.log(`  ✅ Active projects: ${projects.length}`);
    console.log(`  ✅ Project health: ${activeProject?.health_state}`);

    console.log('\n====================================================');
    console.log('CERTIFICATION SUCCESSFUL');
    console.log('READY FOR Z.4.6');
    console.log('====================================================');

  } catch (err: any) {
    console.error('\n❌ CERTIFICATION FAILED');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n[CLEANUP] Removing test data...');
    if (goalId) await supabase.from('user_goals').delete().eq('id', goalId);
    console.log('  ✅ Cleanup complete.');
  }
}

runExecutiveDashboardCertification();
